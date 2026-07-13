import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 }           from '@nestjs/event-emitter';
import { InjectDataSource }        from '@nestjs/typeorm';
import { DataSource }              from 'typeorm';
import { RefundRepository }        from '../repositories/refund.repository';
import { DoubleEntryService }      from './double-entry.service';
import { AccountingPeriodService } from './accounting-period.service';
import {
  RefundEvents,
  type RefundPendingPayload,
  type RefundProcessingPayload,
  type RefundCompletedPayload,
  type RefundRejectedPayload,
} from '../events/refund.events';
import {
  RefundEntity,
  RefundLineAllocationEntity,
} from '../entities/refund.entity';
import { InvoiceEntity }           from '../entities/invoice.entity';
import { PaymentEntity }           from '../entities/payment.entity';
import { PaymentAllocationEntity } from '../entities/payment.entity';
import { InvoiceTaxEntity }        from '../entities/invoice-line.entity';
import {
  PaymentGatewayAdapter,
  StripeAdapter,
  RazorpayAdapter,
} from '../gateway/payment-gateway.adapter';
import type {
  PrepareRefundDto,
  CompleteRefundDto,
  RejectRefundDto,
} from '../dto/refund.dto';
import type { RefundStatus }       from '../entities/refund.entity';

// ── GL accounts ───────────────────────────────────────────────────────────────
// All verified in existing CoA seeder.

const GL = {
  BANK:                '1120',
  CLEARING:            '1130',
  CASH:                '1110',
  REFUNDS_PAYABLE:     '2180',
  BOOKING_DEFERRED:    '2120',
  MEMBERSHIP_DEFERRED: '2130',
  TAX_PAYABLE:         '2160',
} as const;

/** CR account for Step 2 based on original payment method. */
function disbursementAccount(method: string): string {
  switch (method) {
    case 'cash':         return GL.CASH;
    case 'online_card':
    case 'card_present':
    case 'upi':
    case 'bank_transfer': return GL.CLEARING;
    default:             return GL.BANK;
  }
}

/** DR account for Step 1 deferred revenue component. */
function deferredRevenueAccount(sourceType: string | null): string {
  switch (sourceType) {
    case 'membership': return GL.MEMBERSHIP_DEFERRED;
    default:           return GL.BOOKING_DEFERRED;
  }
}

// ── Largest-remainder allocation ──────────────────────────────────────────────

/**
 * Allocates refundAmount across components proportionally using largest-remainder
 * to guarantee sum(result) === refundAmount with no rounding drift.
 *
 * components: array of [label, originalAmount] pairs.
 * Returns matching array of allocated amounts.
 */
function largestRemainder(
  refundAmount: number,
  components:   Array<{ label: string; original: number }>,
  total:        number,
): number[] {
  if (refundAmount === 0) return components.map(() => 0);
  const exact   = components.map((c) => (refundAmount * c.original) / total);
  const floored = exact.map((x)  => Math.floor(x));
  const fracs   = exact.map((x, i) => x - floored[i]!);
  let remainder = refundAmount - floored.reduce((a, b) => a + b, 0);
  const order   = fracs
    .map((f, i) => ({ i, f }))
    .sort((a, b) => b.f - a.f);
  const result  = [...floored];
  for (const { i } of order) {
    if (remainder <= 0) break;
    result[i]!++;
    remainder--;
  }
  const sum = result.reduce((a, b) => a + b, 0);
  if (sum !== refundAmount) {
    throw new Error(
      `Largest-remainder allocation BUG: sum=${sum} !== refundAmount=${refundAmount}`,
    );
  }
  return result;
}

// ── State machine ─────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  pending:    ['processing', 'rejected'],
  processing: ['completed'],
  completed:  [],
  rejected:   [],
};

function assertRefundTransition(from: RefundStatus, to: RefundStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Cannot transition refund from "${from}" to "${to}". ` +
      `Allowed: [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`,
    );
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  private readonly adapters: Map<string, PaymentGatewayAdapter>;

  constructor(
    private readonly refundRepository:   RefundRepository,
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

  // ── Phase A — prepareRefund() ─────────────────────────────────────────────
  //
  // Creates the RefundEntity row BEFORE the gateway call.
  // All capacity validation and the idempotency key are persisted atomically
  // under PaymentEntity + InvoiceEntity FOR UPDATE locks.
  // No journal is posted. No amountRefundedMinor change.
  //
  // Lock order: PaymentEntity → InvoiceEntity (consistent with PaymentService)

  async prepareRefund(
    dto:      PrepareRefundDto,
    tenantId: string,
    actorId:  string,
  ): Promise<RefundEntity> {
    if (!Number.isInteger(dto.amountMinor) || dto.amountMinor <= 0) {
      throw new BadRequestException('amountMinor must be a positive integer (minor units)');
    }

    // Period check — read-only, before tx
    await this.periodService.assertOpen(tenantId, new Date());

    const refundNumber = await this.refundRepository.nextRefundNumber(tenantId);

    const refund = await this.dataSource.transaction(async (manager) => {
      // Lock payment first (consistent with PaymentService.allocate)
      const payment = await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id',           { id: dto.paymentId })
        .andWhere('p.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!payment) throw new BadRequestException(`Payment ${dto.paymentId} not found`);
      if (payment.status !== 'captured' && payment.status !== 'chargedback') {
        throw new BadRequestException(
          `Cannot refund payment with status "${payment.status}"`,
        );
      }

      // Lock invoice second
      const invoice = await manager
        .createQueryBuilder(InvoiceEntity, 'inv')
        .setLock('pessimistic_write')
        .where('inv.id = :id',           { id: dto.invoiceId })
        .andWhere('inv.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!invoice) throw new BadRequestException(`Invoice ${dto.invoiceId} not found`);
      if (['voided', 'refunded', 'draft', 'issued', 'pending'].includes(invoice.status)) {
        throw new BadRequestException(
          `Cannot refund invoice with status "${invoice.status}"`,
        );
      }
      if (invoice.amountPaidMinor <= 0) {
        throw new BadRequestException('Invoice has no paid amount to refund');
      }
      if (dto.amountMinor > invoice.amountPaidMinor) {
        throw new BadRequestException(
          `Refund amount (${dto.amountMinor}) exceeds invoice amountPaidMinor (${invoice.amountPaidMinor})`,
        );
      }

      // Verify payment was actually allocated to this invoice
      const allocationExists = await manager.findOne(PaymentAllocationEntity, {
        where: { paymentId: dto.paymentId, invoiceId: dto.invoiceId, tenantId },
      });
      if (!allocationExists) {
        throw new BadRequestException(
          `Payment ${dto.paymentId} has not been allocated to invoice ${dto.invoiceId}`,
        );
      }

      // Capacity check: pending + processing + completed refunds for this invoice
      const alreadyActive = await this.refundRepository.totalActiveRefundedAmount(
        dto.invoiceId, tenantId, manager,
      );
      if (alreadyActive + dto.amountMinor > invoice.amountPaidMinor) {
        throw new BadRequestException(
          `Total active refunds (${alreadyActive + dto.amountMinor}) would exceed ` +
          `invoice amountPaidMinor (${invoice.amountPaidMinor})`,
        );
      }

      // Insert RefundEntity with status = 'pending'
      // idempotencyKey = ref_<refund.id> but we don't have refund.id yet.
      // Use a temporary key; we update it immediately after insert.
      const tmpKey = `tmp_${dto.idempotencyKey}`;
      const created = await this.refundRepository.create(
        {
          tenantId,
          refundNumber,
          paymentId:    dto.paymentId,
          invoiceId:    dto.invoiceId,
          amountMinor:  dto.amountMinor,
          currency:     dto.currency,
          method:       payment.method,
          idempotencyKey: tmpKey,
          sourceType:   dto.sourceType,
          sourceId:     dto.sourceId,
          createdById:  actorId,
        },
        manager,
      );

      // Set stable idempotency key = ref_<refund.id>
      const stableKey = `ref_${created.id}`;
      await manager.update(RefundEntity, { id: created.id, tenantId }, {
        idempotencyKey: stableKey,
        updatedById:    actorId,
      });
      created.idempotencyKey = stableKey;

      return created;
    });

    await this.eventEmitter.emitAsync(RefundEvents.PENDING, {
      tenantId,
      refundId:     refund.id,
      refundNumber: refund.refundNumber,
      paymentId:    refund.paymentId,
      invoiceId:    refund.invoiceId,
      amountMinor:  refund.amountMinor,
      currency:     refund.currency,
      status:       'pending',
      timestamp:    new Date().toISOString(),
    } as RefundPendingPayload);

    this.logger.log(
      `prepareRefund: ${refundNumber} pending (${refund.amountMinor} ${refund.currency}) ` +
      `— payment ${refund.paymentId} → invoice ${refund.invoiceId} — tenant ${tenantId}`,
    );

    return refund;
  }

  // ── Phase B+C — commitAccounting() ───────────────────────────────────────
  //
  // Called after gateway accepts the refund (Phase B).
  // Posts Step 1 journal, inserts allocation rows, updates invoice.
  //
  // Step 1 journal:
  //   DR 2120/2130  Deferred Revenue   refundNetMinor
  //   DR 2160       Tax Payable        per-tax-line amounts
  //   CR 2180       Refunds Payable    refundMinor
  //
  // Lock order: RefundEntity → PaymentEntity → InvoiceEntity
  // (RefundEntity locked first for idempotency guard; then payment+invoice for
  //  capacity re-verification and allocation query.)

  async commitAccounting(
    refundId:      string,
    gatewayRefundId: string | null,
    gatewayMeta:   Record<string, unknown> | null,
    tenantId:      string,
    actorId:       string,
  ): Promise<RefundEntity> {
    const now = new Date();
    await this.periodService.assertOpen(tenantId, now);

    await this.dataSource.transaction(async (manager) => {
      // Lock RefundEntity first (idempotency guard)
      const refund = await manager
        .createQueryBuilder(RefundEntity, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id',           { id: refundId })
        .andWhere('r.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!refund) throw new BadRequestException(`Refund ${refundId} not found`);
      if (refund.step1JournalEntryId) {
        this.logger.warn(
          `commitAccounting: refund ${refundId} already has step1JournalEntryId — idempotent return`,
        );
        return;
      }
      assertRefundTransition(refund.status, 'processing');

      // Lock PaymentEntity
      const payment = await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id',           { id: refund.paymentId })
        .andWhere('p.tenantId = :tid', { tid: tenantId })
        .getOne();

      // Lock InvoiceEntity
      const invoice = await manager
        .createQueryBuilder(InvoiceEntity, 'inv')
        .setLock('pessimistic_write')
        .where('inv.id = :id',           { id: refund.invoiceId })
        .andWhere('inv.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!invoice) throw new BadRequestException(`Invoice ${refund.invoiceId} not found`);

      // Re-verify capacity under lock (guards against race between Phase A and C)
      const alreadyCommitted = await this.refundRepository.totalActiveRefundedAmount(
        refund.invoiceId, tenantId, manager,
      );
      // 'pending' is counted in alreadyCommitted — subtract this refund's own pending amount
      // since it's transitioning from pending → processing (will still be counted after)
      if (alreadyCommitted - refund.amountMinor + refund.amountMinor > invoice.amountPaidMinor) {
        throw new BadRequestException(
          `Refund capacity exceeded under lock — concurrent over-refund prevented`,
        );
      }

      // Load invoice tax rows for cumulative-delta computation
      const taxRows = await manager.find(InvoiceTaxEntity, {
        where: { invoiceId: refund.invoiceId, tenantId },
      });

      // Load prior component allocations (processing + completed only)
      const priorAllocations = await this.refundRepository.priorComponentAllocations(
        refund.invoiceId, tenantId, manager,
      );

      // Build component list: [net, tax1, tax2, ...]
      const netOriginal = invoice.subtotalMinor - invoice.discountMinor;
      const components  = [
        { label: 'net', taxId: null as string | null, original: netOriginal },
        ...taxRows.map((t) => ({ label: `tax_${t.id}`, taxId: t.id, original: t.taxMinor })),
      ];

      // Cumulative-delta: target = LR(cumulative after this refund, components, total)
      const newCumulative = invoice.amountRefundedMinor + refund.amountMinor;
      const targetAllocs  = largestRemainder(
        newCumulative,
        components.map((c) => ({ label: c.label, original: c.original })),
        invoice.totalMinor,
      );

      // prior_allocated per component
      const priorMap = new Map<string, number>();
      for (const prior of priorAllocations) {
        const key = prior.invoiceTaxId ?? 'net';
        priorMap.set(key, (priorMap.get(key) ?? 0) + prior.priorMinor);
      }

      // this_alloc = target - prior
      const thisAlloc = components.map((c, i) => {
        const key   = c.taxId ?? 'net';
        const prior = priorMap.get(key) ?? 0;
        const alloc = (targetAllocs[i] ?? 0) - prior;
        if (alloc < 0) {
          throw new Error(
            `Negative component allocation for ${c.label}: target=${targetAllocs[i]}, prior=${prior}`,
          );
        }
        return alloc;
      });

      // Verify journal balance
      const totalDebit = thisAlloc.reduce((a, b) => a + b, 0);
      if (totalDebit !== refund.amountMinor) {
        throw new Error(
          `Journal imbalance: sum(thisAlloc)=${totalDebit} !== refund.amountMinor=${refund.amountMinor}`,
        );
      }

      // Build journal lines
      const netAlloc = thisAlloc[0] ?? 0;
      const taxLines = thisAlloc.slice(1).map((amt, i) => ({
        accountCode: GL.TAX_PAYABLE,
        debitMinor:  amt,
        creditMinor: 0,
        currency:    refund.currency,
        description: `Tax refund component — ${refund.refundNumber}`,
      }));

      const journalLines = [
        {
          accountCode: deferredRevenueAccount(invoice.sourceType),
          debitMinor:  netAlloc,
          creditMinor: 0,
          currency:    refund.currency,
          description: `Deferred revenue refund — ${refund.refundNumber}`,
        },
        ...taxLines,
        {
          accountCode: GL.REFUNDS_PAYABLE,
          debitMinor:  0,
          creditMinor: refund.amountMinor,
          currency:    refund.currency,
          description: `Refunds payable — ${refund.refundNumber}`,
        },
      ];

      const step1Entry = await this.doubleEntryService.postWithManager(
        {
          tenantId,
          entryType:   'refund',
          sourceType:  'refund',
          sourceId:    refundId,
          description: `Refund Step 1 — ${refund.refundNumber}`,
          postedAt:    now,
          currency:    refund.currency,
          lines:       journalLines,
        },
        manager,
      );

      // Insert allocation rows (INSERT-only)
      const allocationRows = components.map((c, i) => ({
        tenantId,
        refundId,
        invoiceId:     refund.invoiceId,
        componentType: c.taxId ? 'tax' : 'net' as 'net' | 'tax',
        invoiceTaxId:  c.taxId,
        amountMinor:   thisAlloc[i] ?? 0,
      }));
      await this.refundRepository.createAllocations(allocationRows, manager);

      // Determine new invoice refund status
      const newAmountRefunded = invoice.amountRefundedMinor + refund.amountMinor;
      const terminal = newAmountRefunded >= invoice.amountPaidMinor
        && invoice.totalMinor - invoice.amountPaidMinor === 0;
      const newInvoiceStatus = terminal ? 'refunded' : 'partially_refunded';

      // Update invoice — RefundService is sole writer of refund-side fields
      await manager.update(InvoiceEntity, { id: refund.invoiceId, tenantId }, {
        amountRefundedMinor: newAmountRefunded,
        status:              newInvoiceStatus,
        updatedById:         actorId,
      });

      // Update RefundEntity
      await manager.update(RefundEntity, { id: refundId, tenantId }, {
        status:              'processing',
        processingAt:        now,
        step1JournalEntryId: step1Entry.id,
        gatewayRefundId:     gatewayRefundId ?? null,
        gatewayMetadata:     gatewayMeta as any ?? null,
        updatedById:         actorId,
      });
    });

    const updated = await this.refundRepository.findByIdOrFail(refundId, tenantId);

    await this.eventEmitter.emitAsync(RefundEvents.PROCESSING, {
      tenantId,
      refundId,
      refundNumber:        updated.refundNumber,
      paymentId:           updated.paymentId,
      invoiceId:           updated.invoiceId,
      amountMinor:         updated.amountMinor,
      currency:            updated.currency,
      status:              'processing',
      step1JournalEntryId: updated.step1JournalEntryId!,
      timestamp:           now.toISOString(),
    } as RefundProcessingPayload);

    this.logger.log(
      `commitAccounting: refund ${updated.refundNumber} processing — ` +
      `journal ${updated.step1JournalEntryId} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── Phase C2 — completeRefund() ───────────────────────────────────────────
  //
  // Posts Step 2 journal after gateway confirms disbursement.
  //
  // Step 2 journal:
  //   DR 2180 Refunds Payable       amountMinor
  //   CR 1130/1120/1110 Cash/Bank   amountMinor

  async completeRefund(
    refundId: string,
    dto:      CompleteRefundDto,
    tenantId: string,
    actorId:  string,
  ): Promise<RefundEntity> {
    const now = new Date();
    await this.periodService.assertOpen(tenantId, now);

    await this.dataSource.transaction(async (manager) => {
      const refund = await manager
        .createQueryBuilder(RefundEntity, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id',           { id: refundId })
        .andWhere('r.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!refund) throw new BadRequestException(`Refund ${refundId} not found`);
      if (refund.step2JournalEntryId) {
        this.logger.warn(`completeRefund: ${refundId} already completed — idempotent return`);
        return;
      }
      assertRefundTransition(refund.status, 'completed');

      const step2Entry = await this.doubleEntryService.postWithManager(
        {
          tenantId,
          entryType:   'refund',
          sourceType:  'refund',
          sourceId:    refundId,
          description: `Refund Step 2 — ${refund.refundNumber}`,
          postedAt:    now,
          currency:    refund.currency,
          lines: [
            {
              accountCode: GL.REFUNDS_PAYABLE,
              debitMinor:  refund.amountMinor,
              creditMinor: 0,
              currency:    refund.currency,
              description: `Refunds payable cleared — ${refund.refundNumber}`,
            },
            {
              accountCode: disbursementAccount(refund.method),
              debitMinor:  0,
              creditMinor: refund.amountMinor,
              currency:    refund.currency,
              description: `Cash disbursed — ${refund.refundNumber}`,
            },
          ],
        },
        manager,
      );

      await manager.update(RefundEntity, { id: refundId, tenantId }, {
        status:              'completed',
        completedAt:         now,
        step2JournalEntryId: step2Entry.id,
        gatewayRefundId:     dto.gatewayRefundId    ?? refund.gatewayRefundId,
        gatewayMetadata:     dto.gatewayMetadata as any ?? refund.gatewayMetadata,
        updatedById:         actorId,
      });
    });

    const updated = await this.refundRepository.findByIdOrFail(refundId, tenantId);

    await this.eventEmitter.emitAsync(RefundEvents.COMPLETED, {
      tenantId,
      refundId,
      refundNumber:        updated.refundNumber,
      paymentId:           updated.paymentId,
      invoiceId:           updated.invoiceId,
      amountMinor:         updated.amountMinor,
      currency:            updated.currency,
      status:              'completed',
      step1JournalEntryId: updated.step1JournalEntryId!,
      step2JournalEntryId: updated.step2JournalEntryId!,
      timestamp:           now.toISOString(),
    } as RefundCompletedPayload);

    this.logger.log(
      `completeRefund: refund ${updated.refundNumber} completed — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── Phase D — rejectRefund() ──────────────────────────────────────────────
  //
  // Called when gateway rejects the refund. No journal is posted.
  // No amountRefundedMinor change. Capacity released (rejected excluded from predicate).

  async rejectRefund(
    refundId: string,
    dto:      RejectRefundDto,
    tenantId: string,
    actorId:  string,
  ): Promise<RefundEntity> {
    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const refund = await manager
        .createQueryBuilder(RefundEntity, 'r')
        .setLock('pessimistic_write')
        .where('r.id = :id',           { id: refundId })
        .andWhere('r.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!refund) throw new BadRequestException(`Refund ${refundId} not found`);
      assertRefundTransition(refund.status, 'rejected');

      await manager.update(RefundEntity, { id: refundId, tenantId }, {
        status:          'rejected',
        rejectedAt:      now,
        rejectionReason: dto.reason,
        updatedById:     actorId,
      });
    });

    const updated = await this.refundRepository.findByIdOrFail(refundId, tenantId);

    await this.eventEmitter.emitAsync(RefundEvents.REJECTED, {
      tenantId,
      refundId,
      refundNumber:    updated.refundNumber,
      paymentId:       updated.paymentId,
      invoiceId:       updated.invoiceId,
      amountMinor:     updated.amountMinor,
      currency:        updated.currency,
      status:          'rejected',
      rejectionReason: dto.reason,
      timestamp:       now.toISOString(),
    } as RefundRejectedPayload);

    this.logger.warn(
      `rejectRefund: refund ${updated.refundNumber} rejected — ${dto.reason} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── requestRefund() — synchronous facade ─────────────────────────────────
  //
  // Orchestrates Phase A → gateway call → Phase C for synchronous gateways.
  // For cash/manual: no real gateway call; proceeds directly to Phase C.

  async requestRefund(
    dto:      PrepareRefundDto,
    tenantId: string,
    actorId:  string,
  ): Promise<RefundEntity> {
    // Phase A — create pending row, reserve capacity
    const pending = await this.prepareRefund(dto, tenantId, actorId);

    // Phase B — gateway call (outside DB transaction)
    let gatewayRefundId: string | null = null;
    let gatewayMeta:     Record<string, unknown> | null = null;

    // Determine the payment's gateway from the payment row
    const payment = await this.dataSource.getRepository(PaymentEntity).findOne({
      where: { id: dto.paymentId, tenantId },
    });

    const adapter = payment ? this.adapter(payment.gateway) : null;

    if (adapter) {
      try {
        const result = await adapter.refund({
          gatewayPaymentId: payment!.gatewayPaymentId ?? '',
          amountMinor:      dto.amountMinor,
          currency:         dto.currency,
          idempotencyKey:   pending.idempotencyKey,
        });
        gatewayRefundId = result.gatewayRefundId;
        gatewayMeta     = result.rawResponse;
      } catch (err) {
        // Gateway rejected — Phase D
        this.logger.error(
          `requestRefund: gateway rejected for refund ${pending.id}: ${(err as Error).message}`,
        );
        await this.rejectRefund(
          pending.id,
          { reason: (err as Error).message },
          tenantId,
          actorId,
        );
        throw new BadRequestException(
          `Gateway rejected refund: ${(err as Error).message}`,
        );
      }
    }
    // cash/manual: no adapter, proceed directly

    // Phase C — accounting commit
    return this.commitAccounting(
      pending.id,
      gatewayRefundId,
      gatewayMeta,
      tenantId,
      actorId,
    );
  }

  // ── Read paths ────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<RefundEntity> {
    return this.refundRepository.findByIdOrFail(id, tenantId);
  }

  async findByInvoice(invoiceId: string, tenantId: string): Promise<RefundEntity[]> {
    return this.refundRepository.findByInvoice(invoiceId, tenantId);
  }

  async findByPayment(paymentId: string, tenantId: string): Promise<RefundEntity[]> {
    return this.refundRepository.findByPayment(paymentId, tenantId);
  }

  async findAll(
    tenantId: string,
    opts: { status?: RefundStatus; limit?: number; offset?: number } = {},
  ): Promise<RefundEntity[]> {
    return this.refundRepository.findAll(tenantId, opts);
  }
}
