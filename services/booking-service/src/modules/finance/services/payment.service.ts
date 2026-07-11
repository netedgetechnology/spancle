import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }         from '@nestjs/event-emitter';
import { InjectDataSource }      from '@nestjs/typeorm';
import { DataSource }            from 'typeorm';
import { PaymentRepository }     from '../repositories/payment.repository';
import { InvoiceRepository }     from '../repositories/invoice.repository';
import { JournalRepository }     from '../repositories/journal.repository';
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
  StripeAdapter,
  RazorpayAdapter,
} from '../gateway/payment-gateway.adapter';
import type { PaymentEntity, PaymentStatus } from '../entities/payment.entity';
import { PaymentEntity as PaymentEntityClass } from '../entities/payment.entity';
import { PaymentAllocationEntity }             from '../entities/payment.entity';
import type {
  InitiatePaymentDto,
  CapturePaymentDto,
  AllocatePaymentDto,
  FailPaymentDto,
} from '../dto/payment.dto';
import type { JournalEntryInput } from '../repositories/journal.repository';

// ── GL accounts ───────────────────────────────────────────────────────────────
// Must match ChartOfAccountService seeder (Batch 7.1A).

const GL = {
  ACCOUNTS_RECEIVABLE: '1150',
  BANK:                '1120',
  CLEARING:            '1130',   // in-transit gateway funds
  CASH:                '1110',
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
  initiated:   ['authorized', 'captured', 'failed', 'cancelled'],
  authorized:  ['captured', 'failed', 'cancelled'],
  captured:    ['chargedback'],
  failed:      [],
  cancelled:   [],
  chargedback: [],
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

  private readonly adapters: Map<string, PaymentGatewayAdapter>;

  constructor(
    private readonly paymentRepository:  PaymentRepository,
    private readonly invoiceRepository:  InvoiceRepository,
    private readonly journalRepository:  JournalRepository,
    private readonly doubleEntryService: DoubleEntryService,
    private readonly periodService:      AccountingPeriodService,
    private readonly eventEmitter:       EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.adapters = new Map<string, PaymentGatewayAdapter>([
      ['stripe',   new StripeAdapter()],
      ['razorpay', new RazorpayAdapter()],
    ]);
  }

  private adapter(gateway: string): PaymentGatewayAdapter | null {
    return this.adapters.get(gateway) ?? null;
  }

  private buildEventBase(p: PaymentEntity, timestamp: string) {
    return {
      tenantId:    p.tenantId,
      paymentId:   p.id,
      reference:   p.reference,
      amountMinor: p.amountMinor,
      currency:    p.currency,
      method:      p.method,
      gateway:     p.gateway,
      status:      p.status,
      customerId:  p.customerId ?? null,
      timestamp,
    };
  }

  // ── initiate() ───────────────────────────────────────────────────────────

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
      method:         dto.method,
      gateway:        dto.gateway,
      amountMinor:    dto.amountMinor,
      currency:       dto.currency,
      customerId:     dto.customerId,
      idempotencyKey: dto.idempotencyKey,
      ipAddress:      dto.ipAddress,
      deviceId:       dto.deviceId,
      createdById:    actorId,
    });

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

  // ── authorize() ──────────────────────────────────────────────────────────

  async authorize(
    id:               string,
    gatewayPaymentId: string,
    tenantId:         string,
    actorId:          string,
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

  // ── capture() ────────────────────────────────────────────────────────────
  //
  // Accounting treatment:
  //   DR 1110/1120/1130  Cash / Bank / Clearing   capturedMinor
  //   CR 1150            Accounts Receivable       capturedMinor
  //
  // This correctly records the receipt of funds. AR is reduced by the captured
  // amount regardless of which invoice the payment is allocated to — the
  // invoice receivable was already recognised at InvoiceService.finalise().
  //
  // FIX A: Duplicate-capture guard — checks journalEntryId before posting.
  // FIX A: Atomic DB write — journal post and payment status update inside
  //         one DataSource.transaction(), using journalRepository.insertEntry()
  //         directly rather than doubleEntryService.post() (which opens its own
  //         transaction). The period and balance checks still run before the tx.

  async capture(
    id:       string,
    dto:      CapturePaymentDto,
    tenantId: string,
    actorId:  string,
  ): Promise<PaymentEntity> {
    const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(payment.status, 'captured');

    // FIX A — duplicate journal guard: if journalEntryId already set, a previous
    // capture() succeeded partially. Return without re-posting.
    if (payment.journalEntryId) {
      this.logger.warn(
        `capture: payment ${payment.id} already has journalEntryId ${payment.journalEntryId} ` +
        `— returning without re-posting`,
      );
      return this.paymentRepository.findByIdOrFail(id, tenantId);
    }

    const captureMinor = dto.amountMinor ?? payment.amountMinor;
    if (!Number.isInteger(captureMinor) || captureMinor <= 0) {
      throw new BadRequestException('Capture amount must be a positive integer (minor units)');
    }

    const now = new Date();

    // assertOpen runs before the transaction — it is read-only
    const period = await this.periodService.assertOpen(tenantId, now);
    const periodStr = period.period;

    // Call gateway adapter (non-transactional — must be outside DB tx)
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

    // Validate journal lines balance (done outside tx — pure arithmetic)
    const journalLines = [
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
    ];
    this.doubleEntryService.assertBalanced(journalLines);

    // FIX A — atomic: journal insert + payment status update in one transaction
    const journalEntryId = await this.dataSource.transaction(async (manager) => {
      const reference = await this.journalRepository.nextReference(periodStr, tenantId);

      const entryInput: JournalEntryInput = {
        tenantId,
        reference,
        entryType:        'payment',
        sourceType:       'payment',
        sourceId:         payment.id,
        description:      `Payment received — ${payment.reference ?? payment.id}`,
        postedAt:         now,
        accountingPeriod: periodStr,
        lines:            journalLines,
      };

      const entry = await this.journalRepository.insertEntry(entryInput, manager);

      // Update payment inside same transaction
      await manager.update(PaymentEntityClass, { id, tenantId }, {
        status:              'captured',
        capturedAmountMinor: captureMinor,
        unallocatedMinor:    captureMinor,
        gatewayStatus,
        gatewayMetadata:     gatewayMeta as any,
        capturedAt:          now,
        journalEntryId:      entry.id,
        updatedById:         actorId,
      });

      return entry.id;
    });

    const updated = await this.paymentRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(PaymentEvents.CAPTURED, {
      ...this.buildEventBase(updated, now.toISOString()),
      capturedAmountMinor: captureMinor,
      gatewayPaymentId:    payment.gatewayPaymentId,
      journalEntryId,
    } as PaymentCapturedPayload);

    this.logger.log(
      `capture: payment ${payment.reference} captured (${captureMinor} ${payment.currency}) ` +
      `— journal ${journalEntryId} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── fail() ───────────────────────────────────────────────────────────────

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

  // ── allocate() ───────────────────────────────────────────────────────────
  //
  // No journal entry is posted here — the capture() journal already debited
  // Cash/Clearing and credited AR for the full captured amount. Allocation is
  // an administrative linkage that attributes the receipt to a specific invoice.
  //
  // FIX B: Invoice over-allocation guard — allocatedMinor may not exceed
  //         invoice.outstandingMinor (in addition to the existing payment
  //         unallocated guard).
  //
  // FIX C: Three DB writes wrapped in a single DataSource.transaction() to
  //         prevent partial application (allocation row inserted but invoice
  //         or payment totals not updated).

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
        `Cannot allocate ${dto.allocatedMinor}: only ${payment.unallocatedMinor} unallocated on payment`,
      );
    }

    const invoice = await this.invoiceRepository.findByIdOrFail(dto.invoiceId, tenantId);

    if (invoice.status === 'voided' || invoice.status === 'paid') {
      throw new BadRequestException(
        `Cannot allocate to invoice with status "${invoice.status}"`,
      );
    }

    // FIX B — invoice over-allocation guard
    if (dto.allocatedMinor > invoice.outstandingMinor) {
      throw new BadRequestException(
        `Cannot allocate ${dto.allocatedMinor} to invoice ${invoice.invoiceNumber ?? dto.invoiceId}: ` +
        `only ${invoice.outstandingMinor} outstanding`,
      );
    }

    // FIX C — wrap all three DB writes in a single transaction
    const { newAmountPaid, newOutstanding, newInvoiceStatus } =
      await this.dataSource.transaction(async (manager) => {

        // Re-read totals inside transaction for race-condition safety
        const currentTotal = await manager
          .createQueryBuilder(PaymentAllocationEntity, 'a')
          .select('COALESCE(SUM(a.allocatedMinor), 0)', 'total')
          .where('a.invoiceId = :invoiceId', { invoiceId: dto.invoiceId })
          .andWhere('a.tenantId = :tenantId', { tenantId })
          .getRawOne<{ total: string }>();

        const totalAllocated  = parseInt(currentTotal?.total ?? '0', 10);
        const newAmountPaid   = totalAllocated + dto.allocatedMinor;
        const newOutstanding  = Math.max(0, invoice.totalMinor - newAmountPaid);
        const newInvoiceStatus = newOutstanding === 0 ? 'paid' : 'partially_paid';

        // Insert allocation row
        await manager.save(
          manager.create(PaymentAllocationEntity, {
            tenantId,
            paymentId,
            invoiceId:      dto.invoiceId,
            allocatedMinor: dto.allocatedMinor,
            currency:       payment.currency,
          }),
        );

        // Update invoice payment state
        await manager.update(
          (await import('../entities/invoice.entity')).InvoiceEntity,
          { id: dto.invoiceId, tenantId },
          {
            amountPaidMinor:  newAmountPaid,
            outstandingMinor: newOutstanding,
            status:           newInvoiceStatus,
            paidAt:           newInvoiceStatus === 'paid' ? new Date() : null,
            updatedById:      actorId,
          },
        );

        // Update payment running totals
        const newAllocated   = payment.allocatedMinor + dto.allocatedMinor;
        const newUnallocated = payment.capturedAmountMinor - newAllocated;
        await manager.update(PaymentEntityClass, { id: paymentId, tenantId }, {
          allocatedMinor:   newAllocated,
          unallocatedMinor: newUnallocated,
          updatedById:      actorId,
        });

        return { newAmountPaid, newOutstanding, newInvoiceStatus };
      });

    const updated = await this.paymentRepository.findByIdOrFail(paymentId, tenantId);

    await this.eventEmitter.emitAsync(PaymentEvents.ALLOCATED, {
      tenantId,
      paymentId,
      invoiceId:      dto.invoiceId,
      allocatedMinor: dto.allocatedMinor,
      currency:       payment.currency,
      invoiceStatus:  newInvoiceStatus,
      timestamp:      new Date().toISOString(),
    } as PaymentAllocatedPayload);

    this.logger.log(
      `allocate: payment ${payment.reference} → invoice ${invoice.invoiceNumber ?? dto.invoiceId} ` +
      `(${dto.allocatedMinor} ${payment.currency}) — invoice now ${newInvoiceStatus} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── reconcile() ──────────────────────────────────────────────────────────
  //
  // Calls the gateway adapter to re-query payment status.
  // Only drives capture() when status is still 'authorized' — prevents
  // double-capture on a payment already in 'captured' state.
  // The journalEntryId guard inside capture() provides a second line of defence.

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

    const gatewaySucceeded = ['succeeded', 'captured', 'paid'].includes(
      result.gatewayStatus.toLowerCase(),
    );
    const gatewayFailed = ['failed', 'cancelled', 'expired'].includes(
      result.gatewayStatus.toLowerCase(),
    );

    let updated: PaymentEntity;

    if (gatewaySucceeded && payment.status === 'authorized') {
      // Only drive capture when local status is 'authorized'.
      // capture() also has its own journalEntryId guard as a second layer.
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
