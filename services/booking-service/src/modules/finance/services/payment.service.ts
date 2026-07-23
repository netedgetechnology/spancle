import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }          from '@nestjs/event-emitter';
import { InjectDataSource }       from '@nestjs/typeorm';
import { DataSource }             from 'typeorm';
import { PaymentRepository }      from '../repositories/payment.repository';
import { InvoiceRepository }      from '../repositories/invoice.repository';
import { DoubleEntryService }     from './double-entry.service';
import { AccountingPeriodService } from './accounting-period.service';
import {
  PaymentEvents,
  type PaymentCapturedPayload,
  type PaymentAllocatedPayload,
  type PaymentReconciledPayload,
} from '../events/payment.events';
import {
  PaymentGatewayAdapter,
  PAYMENT_GATEWAY_ADAPTERS,
} from '../gateway/payment-gateway.adapter';
import type { PaymentEntity, PaymentStatus } from '../entities/payment.entity';
import { PaymentEntity as PaymentEntityClass } from '../entities/payment.entity';
import { PaymentAllocationEntity }             from '../entities/payment.entity';
import { InvoiceEntity }                       from '../entities/invoice.entity';
import type {
  InitiatePaymentDto,
  CapturePaymentDto,
  AllocatePaymentDto,
  FailPaymentDto,
} from '../dto/payment.dto';

// ── Accounting model ──────────────────────────────────────────────────────────
//
// ISSUE 1 — CORRECTED ACCOUNTING MODEL
//
// The previous model (DR Cash / CR AR at capture, no journal at allocation)
// produced a permanent GL/subledger mismatch when a payment was captured but
// not yet allocated:
//   GL AR balance = 0   (credit posted at capture)
//   Σ invoice.outstandingMinor = 100   (invoice not yet settled)
//
// CORRECT TWO-STEP MODEL:
//
// Step 1 — capture() posts:
//   DR 1110/1120/1130   Cash / Clearing         capturedMinor
//   CR 2195             Unapplied Receipts       capturedMinor
//
//   Cash is recognised; unallocated funds sit in the Unapplied Receipts
//   liability until attributed to a specific invoice.
//   GL AR is untouched — Σ invoice.outstandingMinor still equals GL AR.
//
// Step 2 — allocate() posts:
//   DR 2195             Unapplied Receipts       allocatedMinor
//   CR 1150             Accounts Receivable      allocatedMinor
//
//   The liability is extinguished and AR is reduced by exactly the allocated
//   amount. After this entry: GL AR = Σ invoice.outstandingMinor. ✅
//
// Scenario verification:
//
//   Fully allocated payment (100 captured, 100 allocated to one invoice):
//     capture:   DR Cash 100 / CR Unapplied 100
//     allocate:  DR Unapplied 100 / CR AR 100
//     Net: DR Cash 100 / CR AR 100  → AR down by 100, invoice paid. ✅
//
//   Unallocated payment (100 captured, 0 allocated):
//     capture:   DR Cash 100 / CR Unapplied 100
//     GL AR unchanged. invoice.outstandingMinor unchanged.
//     GL AR = Σ invoice.outstandingMinor. ✅
//
//   Partial allocation (100 captured, 60 allocated, 40 remaining):
//     capture:   DR Cash 100 / CR Unapplied 100
//     allocate:  DR Unapplied 60 / CR AR 60
//     Unapplied balance = 40. GL AR reduced by 60. Invoice A: 40 outstanding. ✅
//
//   Multiple invoice allocations (100 captured → 60 to Inv A, 40 to Inv B):
//     capture:   DR Cash 100 / CR Unapplied 100
//     allocate1: DR Unapplied 60 / CR AR 60  → Inv A paid
//     allocate2: DR Unapplied 40 / CR AR 40  → Inv B paid
//     Unapplied = 0. GL AR reduced by 100 total. Both invoices paid. ✅

const GL = {
  ACCOUNTS_RECEIVABLE: '1150',
  BANK:                '1120',
  CLEARING:            '1130',
  CASH:                '1110',
  UNAPPLIED_RECEIPTS:  '2195',  // Unapplied Receipts liability (cleared at allocation)
} as const;

function receiptAccount(method: string): string {
  switch (method) {
    case 'cash':          return GL.CASH;
    case 'online_card':
    case 'card_present':
    case 'upi':
    case 'bank_transfer': return GL.CLEARING;
    default:              return GL.BANK;
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
    private readonly doubleEntryService: DoubleEntryService,
    private readonly periodService:      AccountingPeriodService,
    private readonly eventEmitter:       EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(PAYMENT_GATEWAY_ADAPTERS) adapters: PaymentGatewayAdapter[],
  ) {
    this.adapters = new Map<string, PaymentGatewayAdapter>(
      adapters.map((a) => [a.gatewayName, a]),
    );
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
  // ISSUE 1 FIX — corrected accounting:
  //   DR Cash/Clearing   capturedMinor
  //   CR Unapplied Receipts (2195)  capturedMinor
  //
  // ISSUE 2 FIX — accounting boundary:
  //   Uses DoubleEntryService.postWithManager() — not JournalRepository directly.
  //   All assertBalanced, assertOpen, and logging remain in DoubleEntryService.
  //
  // ISSUE 3 FIX — concurrent capture:
  //   Pessimistic FOR UPDATE lock on the payment row inside the transaction.
  //   After locking, re-checks journalEntryId (the row may have changed since
  //   the pre-flight read). Prevents two concurrent captures both observing
  //   journalEntryId = NULL before either commits.

  async capture(
    id:       string,
    dto:      CapturePaymentDto,
    tenantId: string,
    actorId:  string,
  ): Promise<PaymentEntity> {
    // Pre-flight: basic status check before acquiring the lock
    const preCheck = await this.paymentRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(preCheck.status, 'captured');

    const captureMinor = dto.amountMinor ?? preCheck.amountMinor;
    if (!Number.isInteger(captureMinor) || captureMinor <= 0) {
      throw new BadRequestException('Capture amount must be a positive integer (minor units)');
    }

    const now = new Date();

    // Period check is read-only — run before the transaction
    await this.periodService.assertOpen(tenantId, now);

    // Call gateway adapter — non-transactional, must be outside the DB tx
    const adapter = this.adapter(preCheck.gateway);
    let gatewayStatus = 'captured';
    let gatewayMeta: Record<string, unknown> = {};

    if (adapter) {
      const result = await adapter.capture({
        gatewayPaymentId: preCheck.gatewayPaymentId ?? '',
        amountMinor:      captureMinor,
        currency:         preCheck.currency,
        idempotencyKey:   `cap_${preCheck.idempotencyKey ?? preCheck.id}`,
      });
      gatewayStatus = result.gatewayStatus;
      gatewayMeta   = result.rawResponse;
    }

    // ISSUE 3 — pessimistic lock + re-check inside the transaction
    // ISSUE 2 — doubleEntryService.postWithManager() preserves accounting boundary
    const journalEntryId = await this.dataSource.transaction(async (manager) => {
      // Acquire FOR UPDATE lock — blocks any concurrent capture on the same row
      const locked = await manager
        .createQueryBuilder(PaymentEntityClass, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id })
        .andWhere('p.tenantId = :tenantId', { tenantId })
        .getOne();

      if (!locked) throw new BadRequestException(`Payment ${id} not found`);

      // Re-check under lock — a concurrent capture may have already committed
      if (locked.journalEntryId) {
        this.logger.warn(
          `capture: payment ${id} already captured (journalEntryId=${locked.journalEntryId}) ` +
          `— concurrent request resolved via lock`,
        );
        return locked.journalEntryId;
      }

      // Transition guard under lock
      assertTransitionAllowed(locked.status, 'captured');

      // ISSUE 1 — corrected journal: Cash/Clearing / Unapplied Receipts
      const entry = await this.doubleEntryService.postWithManager(
        {
          tenantId,
          entryType:   'payment',
          sourceType:  'payment',
          sourceId:    locked.id,
          description: `Payment received — ${locked.reference ?? locked.id}`,
          postedAt:    now,
          currency:    locked.currency,
          lines: [
            {
              accountCode: receiptAccount(locked.method),
              debitMinor:  captureMinor,
              creditMinor: 0,
              currency:    locked.currency,
              description: `${locked.method} receipt — ${locked.reference}`,
            },
            {
              accountCode: GL.UNAPPLIED_RECEIPTS,
              debitMinor:  0,
              creditMinor: captureMinor,
              currency:    locked.currency,
              description: `Unapplied receipt — ${locked.reference}`,
            },
          ],
        },
        manager,
      );

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
      gatewayPaymentId:    preCheck.gatewayPaymentId,
      journalEntryId,
    } as PaymentCapturedPayload);

    this.logger.log(
      `capture: payment ${preCheck.reference} captured (${captureMinor} ${preCheck.currency}) ` +
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
  // ISSUE 1 FIX — corrected journal at allocation:
  //   DR 2195  Unapplied Receipts   allocatedMinor
  //   CR 1150  Accounts Receivable  allocatedMinor
  //
  //   This clears the liability and reduces AR — maintaining GL AR = Σ outstanding.
  //
  // ISSUE 4 FIX — concurrent allocation:
  //   Pessimistic FOR UPDATE locks on both payment and invoice rows inside
  //   the transaction. All amount reads, validations, and writes happen under
  //   these locks. Two concurrent allocations cannot both pass the unallocated
  //   and outstanding guards simultaneously.
  //
  // ISSUE 2 FIX — accounting boundary:
  //   doubleEntryService.postWithManager() used for the allocation journal.

  async allocate(
    paymentId: string,
    dto:       AllocatePaymentDto,
    tenantId:  string,
    actorId:   string,
  ): Promise<PaymentEntity> {
    if (!Number.isInteger(dto.allocatedMinor) || dto.allocatedMinor <= 0) {
      throw new BadRequestException('allocatedMinor must be a positive integer');
    }

    // Period check is read-only — run before the transaction
    const now = new Date();
    await this.periodService.assertOpen(tenantId, now);

    const { newInvoiceStatus } = await this.dataSource.transaction(async (manager) => {
      // ISSUE 4 — lock payment row first (consistent lock ordering prevents deadlock)
      const payment = await manager
        .createQueryBuilder(PaymentEntityClass, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id', { id: paymentId })
        .andWhere('p.tenantId = :tenantId', { tenantId })
        .getOne();

      if (!payment) throw new BadRequestException(`Payment ${paymentId} not found`);

      if (payment.status !== 'captured') {
        throw new BadRequestException(
          `Can only allocate captured payments. Payment status is "${payment.status}"`,
        );
      }
      if (dto.allocatedMinor > payment.unallocatedMinor) {
        throw new BadRequestException(
          `Cannot allocate ${dto.allocatedMinor}: only ${payment.unallocatedMinor} unallocated on payment`,
        );
      }

      // Lock invoice row second (consistent lock ordering)
      const invoice = await manager
        .createQueryBuilder(InvoiceEntity, 'inv')
        .setLock('pessimistic_write')
        .where('inv.id = :id', { id: dto.invoiceId })
        .andWhere('inv.tenantId = :tenantId', { tenantId })
        .getOne();

      if (!invoice) throw new BadRequestException(`Invoice ${dto.invoiceId} not found`);

      if (invoice.status === 'voided' || invoice.status === 'paid' || invoice.status === 'refunded') {
        throw new BadRequestException(
          `Cannot allocate to invoice with status "${invoice.status}"`,
        );
      }
      // ISSUE 4 — guard reads locked values (not stale pre-tx reads)
      if (dto.allocatedMinor > invoice.outstandingMinor) {
        throw new BadRequestException(
          `Cannot allocate ${dto.allocatedMinor}: only ${invoice.outstandingMinor} outstanding on invoice`,
        );
      }

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

      // ISSUE 1 — allocation journal: DR Unapplied Receipts / CR AR
      await this.doubleEntryService.postWithManager(
        {
          tenantId,
          entryType:   'payment',
          sourceType:  'payment',
          sourceId:    paymentId,
          description: `Payment allocated to invoice ${invoice.invoiceNumber ?? dto.invoiceId}`,
          postedAt:    now,
          currency:    payment.currency,
          lines: [
            {
              accountCode: GL.UNAPPLIED_RECEIPTS,
              debitMinor:  dto.allocatedMinor,
              creditMinor: 0,
              currency:    payment.currency,
              description: `Unapplied cleared — ${payment.reference}`,
            },
            {
              accountCode: GL.ACCOUNTS_RECEIVABLE,
              debitMinor:  0,
              creditMinor: dto.allocatedMinor,
              currency:    payment.currency,
              description: `AR settled — ${invoice.invoiceNumber ?? dto.invoiceId}`,
            },
          ],
        },
        manager,
      );

      // Update invoice under lock — use locked values
      const newAmountPaid    = invoice.amountPaidMinor + dto.allocatedMinor;
      const newOutstanding   = invoice.totalMinor - newAmountPaid;      // no Math.max — guard above ensures >= 0
      const newInvoiceStatus = newOutstanding === 0 ? 'paid' : 'partially_paid';

      await manager.update(InvoiceEntity, { id: dto.invoiceId, tenantId }, {
        amountPaidMinor:  newAmountPaid,
        outstandingMinor: newOutstanding,
        status:           newInvoiceStatus,
        paidAt:           newInvoiceStatus === 'paid' ? now : undefined,
        updatedById:      actorId,
      });

      // Update payment running totals under lock
      const newAllocated   = payment.allocatedMinor + dto.allocatedMinor;
      const newUnallocated = payment.unallocatedMinor - dto.allocatedMinor; // exact — no MAX needed

      await manager.update(PaymentEntityClass, { id: paymentId, tenantId }, {
        allocatedMinor:   newAllocated,
        unallocatedMinor: newUnallocated,
        updatedById:      actorId,
      });

      // ISSUE 5 — verify transactional invariants before commit
      // allocatedMinor + unallocatedMinor === capturedAmountMinor
      if (newAllocated + newUnallocated !== payment.capturedAmountMinor) {
        throw new Error(
          `Payment invariant violated: allocatedMinor(${newAllocated}) + ` +
          `unallocatedMinor(${newUnallocated}) !== ` +
          `capturedAmountMinor(${payment.capturedAmountMinor})`,
        );
      }
      // invoice.amountPaidMinor <= invoice.totalMinor
      if (newAmountPaid > invoice.totalMinor) {
        throw new Error(
          `Invoice invariant violated: amountPaidMinor(${newAmountPaid}) > ` +
          `totalMinor(${invoice.totalMinor})`,
        );
      }
      // invoice.outstandingMinor === invoice.totalMinor - invoice.amountPaidMinor
      if (newOutstanding !== invoice.totalMinor - newAmountPaid) {
        throw new Error(
          `Invoice outstanding invariant violated`,
        );
      }

      return { newInvoiceStatus };
    });

    const updated = await this.paymentRepository.findByIdOrFail(paymentId, tenantId);

    await this.eventEmitter.emitAsync(PaymentEvents.ALLOCATED, {
      tenantId,
      paymentId,
      invoiceId:      dto.invoiceId,
      allocatedMinor: dto.allocatedMinor,
      currency:       updated.currency,
      invoiceStatus:  newInvoiceStatus,
      timestamp:      now.toISOString(),
    } as PaymentAllocatedPayload);

    this.logger.log(
      `allocate: payment ${updated.reference} → invoice ${dto.invoiceId} ` +
      `(${dto.allocatedMinor} ${updated.currency}) — invoice now ${newInvoiceStatus} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── reconcile() ──────────────────────────────────────────────────────────
  //
  // Only drives capture() when status === 'authorized'.
  // capture() acquires a FOR UPDATE lock and re-checks journalEntryId inside
  // the transaction — duplicate journal posting is impossible.

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
    const result = await adapter.reconcile({ gatewayPaymentId: payment.gatewayPaymentId });

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
