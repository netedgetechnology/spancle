import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }         from '@nestjs/event-emitter';
import { PaymentRepository }     from '../repositories/payment.repository';
import { InvoiceRepository }     from '../repositories/invoice.repository';
import { DoubleEntryService }    from './double-entry.service';
import { AccountingPeriodService } from './accounting-period.service';
import {
  PaymentEvents,
  type PaymentCapturedPayload,
  type PaymentAllocatedPayload,
  type PaymentReconciledPayload,
} from '../events/payment.events';
import {
  PaymentGatewayAdapter,
} from '../gateway/payment-gateway.adapter';
import { StripeAdapter }         from '../gateway/payment-gateway.adapter';
import { RazorpayAdapter }       from '../gateway/payment-gateway.adapter';
import type { PaymentEntity, PaymentStatus } from '../entities/payment.entity';
import type {
  InitiatePaymentDto,
  CapturePaymentDto,
  AllocatePaymentDto,
  FailPaymentDto,
} from '../dto/payment.dto';

// ── GL accounts ───────────────────────────────────────────────────────────────
// Must match ChartOfAccountService seeder (Batch 7.1A).

const GL = {
  ACCOUNTS_RECEIVABLE:  '1150',
  BANK:                 '1120',
  CLEARING:             '1130',  // in-transit gateway funds
  CASH:                 '1110',
} as const;

/** Resolve the debit-side GL account from the payment method. */
function receiptAccount(method: string): string {
  switch (method) {
    case 'cash':         return GL.CASH;
    case 'online_card':
    case 'card_present':
    case 'upi':
    case 'bank_transfer': return GL.CLEARING;
    default:             return GL.BANK;
  }
}

// ── Status state machine ──────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  initiated:    ['authorized', 'captured', 'failed', 'cancelled'],
  authorized:   ['captured', 'failed', 'cancelled'],
  captured:     ['chargedback'],
  failed:       [],
  cancelled:    [],
  chargedback:  [],
};

function assertTransitionAllowed(from: PaymentStatus, to: PaymentStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Cannot transition payment from "${from}" to "${to}". ` +
      `Allowed: [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`,
    );
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  /** Gateway adapter registry — keyed by gateway name string. */
  private readonly adapters: Map<string, PaymentGatewayAdapter>;

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
    private readonly doubleEntryService: DoubleEntryService,
    private readonly periodService:      AccountingPeriodService,
    private readonly eventEmitter:       EventEmitter2,
  ) {
    // Register adapters. New gateways: add to this map — no other changes needed.
    this.adapters = new Map<string, PaymentGatewayAdapter>([
      ['stripe',   new StripeAdapter()],
      ['razorpay', new RazorpayAdapter()],
      // 'cash' and 'manual' have no external gateway — they skip adapter calls.
    ]);
  }

  private adapter(gateway: string): PaymentGatewayAdapter | null {
    return this.adapters.get(gateway) ?? null;
  }

  private buildEventBase(p: PaymentEntity, timestamp: string) {
    return {
      tenantId:   p.tenantId,
      paymentId:  p.id,
      reference:  p.reference,
      amountMinor: p.amountMinor,
      currency:   p.currency,
      method:     p.method,
      gateway:    p.gateway,
      status:     p.status,
      customerId: p.customerId ?? null,
      timestamp,
    };
  }

  // ── initiate() ────────────────────────────────────────────────────────────

  /**
   * Creates a payment record and calls the gateway to initialise the transaction.
   *
   * Idempotency (M7): if idempotencyKey matches an existing payment for this
   * tenant, the existing payment is returned without creating a duplicate.
   *
   * For cash / manual gateways, no adapter call is made. The payment moves
   * directly to 'authorized' pending physical cash receipt confirmation.
   */
  async initiate(
    dto:      InitiatePaymentDto,
    tenantId: string,
    actorId:  string,
  ): Promise<PaymentEntity> {
    // M7 idempotency gate
    const existing = await this.paymentRepository.findByIdempotencyKey(
      dto.idempotencyKey, tenantId,
    );
    if (existing) {
      this.logger.warn(
        `initiate: idempotency hit for key ${dto.idempotencyKey} → returning ${existing.id}`,
      );
      return existing;
    }

    const reference = await this.paymentRepository.nextReference(tenantId);

    const payment = await this.paymentRepository.create({
      tenantId,
      reference,
      method:       dto.method,
      gateway:      dto.gateway,
      amountMinor:  dto.amountMinor,
      currency:     dto.currency,
      customerId:   dto.customerId,
      idempotencyKey: dto.idempotencyKey,
      ipAddress:    dto.ipAddress,
      deviceId:     dto.deviceId,
      createdById:  actorId,
    });

    // Call gateway adapter when not cash/manual
    const adapter = this.adapter(dto.gateway);
    if (adapter) {
      try {
        const result = await adapter.initiate({
          tenantId,
          amountMinor:    dto.amountMinor,
          currency:       dto.currency,
          customerId:     dto.customerId,
          idempotencyKey: dto.idempotencyKey,
        });
        await this.paymentRepository.update(payment.id, tenantId, {
          gatewayPaymentId: result.gatewayPaymentId,
          gatewayStatus:    result.gatewayStatus,
          gatewayMetadata:  result.rawResponse as any,
          updatedById:      actorId,
        });
        payment.gatewayPaymentId = result.gatewayPaymentId;
        payment.gatewayStatus    = result.gatewayStatus;
      } catch (err) {
        this.logger.error(`initiate: gateway error — ${(err as Error).message}`);
        await this.fail(payment.id, { reason: (err as Error).message }, tenantId, actorId);
        throw new UnprocessableEntityException(
          `Gateway initiation failed: ${(err as Error).message}`,
        );
      }
    }

    await this.eventEmitter.emitAsync(PaymentEvents.INITIATED, {
      ...this.buildEventBase(payment, new Date().toISOString()),
    });

    this.logger.log(`initiate: payment ${reference} created — tenant ${tenantId}`);
    return this.paymentRepository.findByIdOrFail(payment.id, tenantId);
  }

  // ── authorize() ───────────────────────────────────────────────────────────

  /**
   * Records gateway authorisation (e.g. 3DS completes, card authorised).
   * Typically triggered by a webhook in production.
   */
  async authorize(
    id:              string,
    gatewayPaymentId: string,
    tenantId:        string,
    actorId:         string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(payment.status, 'authorized');

    const now = new Date();
    await this.paymentRepository.update(id, tenantId, {
      status:           'authorized',
      gatewayPaymentId,
      authorizedAt:     now,
      updatedById:      actorId,
    });

    await this.eventEmitter.emitAsync(PaymentEvents.AUTHORIZED, {
      ...this.buildEventBase({ ...payment, status: 'authorized' }, now.toISOString()),
    });

    return this.paymentRepository.findByIdOrFail(id, tenantId);
  }

  // ── capture() ─────────────────────────────────────────────────────────────

  /**
   * Captures the payment and posts the double-entry journal entry.
   *
   * Journal entry posted:
   *   DR  1110/1120/1130  Cash / Bank / Clearing    capturedMinor
   *   CR  1150            Accounts Receivable        capturedMinor
   *
   * This records the cash receipt. The deferred → earned revenue recognition
   * happens separately when the booking is completed (Batch 7.4).
   */
  async capture(
    id:       string,
    dto:      CapturePaymentDto,
    tenantId: string,
    actorId:  string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(payment.status, 'captured');

    const captureMinor = dto.amountMinor ?? payment.amountMinor;

    if (!Number.isInteger(captureMinor) || captureMinor <= 0) {
      throw new BadRequestException('Capture amount must be a positive integer (minor units)');
    }

    const now = new Date();
    await this.periodService.assertOpen(tenantId, now);

    // Call gateway adapter for online payments
    const adapter = this.adapter(payment.gateway);
    let gatewayStatus = 'captured';
    let gatewayMeta: Record<string, unknown> = {};

    if (adapter) {
      const result = await adapter.capture({
        gatewayPaymentId: payment.gatewayPaymentId ?? '',
        amountMinor:      captureMinor,
        currency:         payment.currency,
        idempotencyKey:   `cap_${payment.idempotencyKey ?? payment.id}`,
      });
      gatewayStatus = result.gatewayStatus;
      gatewayMeta   = result.rawResponse;
    }

    // Post double-entry: DR Cash/Clearing / CR Accounts Receivable
    const periodStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const journalEntry = await this.doubleEntryService.post({
      tenantId,
      entryType:   'payment',
      sourceType:  'payment',
      sourceId:    payment.id,
      description: `Payment received — ${payment.reference ?? payment.id}`,
      postedAt:    now,
      currency:    payment.currency,
      lines: [
        {
          accountCode: receiptAccount(payment.method),
          debitMinor:  captureMinor,
          creditMinor: 0,
          currency:    payment.currency,
          description: `${payment.method} receipt — ${payment.reference}`,
        },
        {
          accountCode: GL.ACCOUNTS_RECEIVABLE,
          debitMinor:  0,
          creditMinor: captureMinor,
          currency:    payment.currency,
          description: `AR cleared — ${payment.reference}`,
        },
      ],
    });

    await this.paymentRepository.update(id, tenantId, {
      status:              'captured',
      capturedAmountMinor: captureMinor,
      unallocatedMinor:    captureMinor,
      gatewayStatus,
      gatewayMetadata:     gatewayMeta as any,
      capturedAt:          now,
      journalEntryId:      journalEntry.id,
      updatedById:         actorId,
    });

    const updated = await this.paymentRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(PaymentEvents.CAPTURED, {
      ...this.buildEventBase(updated, now.toISOString()),
      capturedAmountMinor: captureMinor,
      gatewayPaymentId:    payment.gatewayPaymentId,
      journalEntryId:      journalEntry.id,
    } as PaymentCapturedPayload);

    this.logger.log(
      `capture: payment ${payment.reference} captured (${captureMinor} ${payment.currency}) ` +
      `— journal ${journalEntry.id} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── fail() ────────────────────────────────────────────────────────────────

  async fail(
    id:       string,
    dto:      FailPaymentDto,
    tenantId: string,
    actorId:  string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(payment.status, 'failed');

    const now = new Date();
    await this.paymentRepository.update(id, tenantId, {
      status:        'failed',
      failureReason: dto.reason ?? null,
      failedAt:      now,
      updatedById:   actorId,
    });

    const updated = await this.paymentRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(PaymentEvents.FAILED, {
      ...this.buildEventBase(updated, now.toISOString()),
      failureReason: dto.reason ?? null,
    });

    this.logger.warn(`fail: payment ${payment.reference ?? id} failed — tenant ${tenantId}`);
    return updated;
  }

  // ── allocate() ────────────────────────────────────────────────────────────

  /**
   * Allocates captured payment funds to an invoice.
   *
   * Rules:
   *   - Payment must be in 'captured' status.
   *   - allocatedMinor must not exceed unallocatedMinor.
   *   - Invoice status progresses: issued → partially_paid → paid.
   *   - PaymentService is the SOLE updater of invoice payment status.
   *   - No journal entry: the capture journal already moved money from
   *     Clearing to AR. Allocation is an administrative linkage.
   */
  async allocate(
    paymentId: string,
    dto:       AllocatePaymentDto,
    tenantId:  string,
    actorId:   string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findByIdOrFail(paymentId, tenantId);

    if (payment.status !== 'captured') {
      throw new BadRequestException(
        `Can only allocate captured payments. Payment status is "${payment.status}"`,
      );
    }
    if (!Number.isInteger(dto.allocatedMinor) || dto.allocatedMinor <= 0) {
      throw new BadRequestException('allocatedMinor must be a positive integer');
    }
    if (dto.allocatedMinor > payment.unallocatedMinor) {
      throw new BadRequestException(
        `Cannot allocate ${dto.allocatedMinor}: only ${payment.unallocatedMinor} unallocated`,
      );
    }

    const invoice = await this.invoiceRepository.findByIdOrFail(dto.invoiceId, tenantId);

    if (invoice.status === 'voided' || invoice.status === 'paid') {
      throw new BadRequestException(
        `Cannot allocate to invoice with status "${invoice.status}"`,
      );
    }

    // Compute new invoice payment state
    const totalAllocated = await this.paymentRepository
      .findAllocationsByInvoice(dto.invoiceId, tenantId)
      .then((rows) => rows.reduce((s, r) => s + r.allocatedMinor, 0));

    const newAmountPaid   = totalAllocated + dto.allocatedMinor;
    const newOutstanding  = Math.max(0, invoice.totalMinor - newAmountPaid);
    const newInvoiceStatus = newOutstanding === 0 ? 'paid' : 'partially_paid';

    // Write allocation row
    await this.paymentRepository.createAllocation({
      tenantId,
      paymentId,
      invoiceId:      dto.invoiceId,
      allocatedMinor: dto.allocatedMinor,
      currency:       payment.currency,
    });

    // Update invoice — PaymentService is the SOLE writer of these fields
    await this.invoiceRepository.update(dto.invoiceId, tenantId, {
      amountPaidMinor:  newAmountPaid,
      outstandingMinor: newOutstanding,
      status:           newInvoiceStatus as any,
      paidAt:           newInvoiceStatus === 'paid' ? new Date() : undefined,
      updatedById:      actorId,
    });

    // Update payment running totals
    const newAllocated    = payment.allocatedMinor + dto.allocatedMinor;
    const newUnallocated  = payment.capturedAmountMinor - newAllocated;
    await this.paymentRepository.update(paymentId, tenantId, {
      allocatedMinor:   newAllocated,
      unallocatedMinor: newUnallocated,
      updatedById:      actorId,
    });

    const updated = await this.paymentRepository.findByIdOrFail(paymentId, tenantId);
    const now     = new Date().toISOString();

    await this.eventEmitter.emitAsync(PaymentEvents.ALLOCATED, {
      tenantId,
      paymentId,
      invoiceId:     dto.invoiceId,
      allocatedMinor: dto.allocatedMinor,
      currency:      payment.currency,
      invoiceStatus: newInvoiceStatus,
      timestamp:     now,
    } as PaymentAllocatedPayload);

    this.logger.log(
      `allocate: payment ${payment.reference} → invoice ${invoice.invoiceNumber ?? dto.invoiceId} ` +
      `(${dto.allocatedMinor} ${payment.currency}) — invoice now ${newInvoiceStatus} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── reconcile() ───────────────────────────────────────────────────────────

  /**
   * Re-queries the gateway for the current status of a payment.
   * Used by the reconciliation scheduler (Batch 7.4) to detect stale
   * 'authorized' or 'initiated' payments.
   *
   * If the gateway reports 'succeeded/captured' but the local status is still
   * 'authorized', capture() is called to bring the state in sync.
   * If the gateway reports failure, fail() is called.
   */
  async reconcile(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);

    if (!payment.gatewayPaymentId) {
      throw new BadRequestException(
        `Payment ${id} has no gateway payment ID — cannot reconcile`,
      );
    }

    const adapter = this.adapter(payment.gateway);
    if (!adapter) {
      throw new BadRequestException(
        `No gateway adapter for "${payment.gateway}" — cannot reconcile`,
      );
    }

    const previousStatus = payment.status;
    const result = await adapter.reconcile({
      gatewayPaymentId: payment.gatewayPaymentId,
    });

    await this.paymentRepository.update(id, tenantId, {
      gatewayStatus: result.gatewayStatus,
      updatedById:   actorId,
    });

    // Drive local state based on gateway response
    const gatewaySucceeded = ['succeeded', 'captured', 'paid'].includes(
      result.gatewayStatus.toLowerCase(),
    );
    const gatewayFailed = ['failed', 'cancelled', 'expired'].includes(
      result.gatewayStatus.toLowerCase(),
    );

    let updated: PaymentEntity;

    if (gatewaySucceeded && payment.status === 'authorized') {
      updated = await this.capture(id, {}, tenantId, actorId);
    } else if (gatewayFailed && !['failed', 'cancelled', 'captured'].includes(payment.status)) {
      updated = await this.fail(id, { reason: `Reconciled: ${result.gatewayStatus}` }, tenantId, actorId);
    } else {
      updated = await this.paymentRepository.findByIdOrFail(id, tenantId);
    }

    await this.eventEmitter.emitAsync(PaymentEvents.RECONCILED, {
      tenantId,
      paymentId:        id,
      gatewayPaymentId: payment.gatewayPaymentId,
      previousStatus,
      newStatus:        updated.status,
      timestamp:        new Date().toISOString(),
    } as PaymentReconciledPayload);

    return updated;
  }

  // ── Read paths ────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<PaymentEntity> {
    return this.paymentRepository.findByIdOrFail(id, tenantId);
  }

  async findAll(
    tenantId: string,
    opts: {
      status?:     PaymentStatus;
      customerId?: string;
      limit?:      number;
      offset?:     number;
    } = {},
  ): Promise<PaymentEntity[]> {
    return this.paymentRepository.findAll(tenantId, opts);
  }

  async findAllocations(paymentId: string, tenantId: string) {
    await this.paymentRepository.findByIdOrFail(paymentId, tenantId);
    return this.paymentRepository.findAllocationsByPayment(paymentId, tenantId);
  }
}
