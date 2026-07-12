import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 }           from '@nestjs/event-emitter';
import { InjectDataSource }        from '@nestjs/typeorm';
import { DataSource }              from 'typeorm';
import { DisputeRepository }       from '../repositories/dispute.repository';
import { PaymentRepository }       from '../repositories/payment.repository';
import { DoubleEntryService }      from './double-entry.service';
import { AccountingPeriodService } from './accounting-period.service';
import {
  DisputeEvents,
  type DisputeOpenedPayload,
  type DisputeWonPayload,
  type DisputeLostPayload,
  type DisputeCancelledPayload,
} from '../events/dispute.events';
import { DisputeEntity, type DisputeStatus } from '../entities/dispute.entity';
import { PaymentEntity }           from '../entities/payment.entity';
import type {
  OpenDisputeDto,
  ResolveDisputeDto,
  CancelDisputeDto,
} from '../dto/dispute.dto';

// ── GL accounts (must exist in ChartOfAccountService seeder) ─────────────────
//
// Verified against existing CoA:
//   1130  Merchant Settlement Account  (asset, postable) — gateway clearing
//   1190  Chargebacks Receivable       (asset, postable) — disputed funds owed back
//   5100  Payment Processing Fees      (expense, postable) — chargeback fees
//   5210  Chargeback Expense           (expense, postable) — loss when dispute lost

const GL = {
  MERCHANT_SETTLEMENT:    '1130',
  CHARGEBACKS_RECEIVABLE: '1190',
  PROCESSING_FEES:        '5100',
  CHARGEBACK_EXPENSE:     '5210',
} as const;

// ── State machine ─────────────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  opened:       ['under_review', 'won', 'lost', 'cancelled'],
  under_review: ['won', 'lost', 'cancelled'],
  won:          [],
  lost:         [],
  cancelled:    [],
};

function assertTransitionAllowed(from: DisputeStatus, to: DisputeStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new BadRequestException(
      `Cannot transition dispute from "${from}" to "${to}". ` +
      `Allowed: [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`,
    );
  }
}

function isTerminal(status: DisputeStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DisputeService {
  private readonly logger = new Logger(DisputeService.name);

  constructor(
    private readonly disputeRepository: DisputeRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly doubleEntryService: DoubleEntryService,
    private readonly periodService:      AccountingPeriodService,
    private readonly eventEmitter:       EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── openDispute() ─────────────────────────────────────────────────────────
  //
  // Accounting journal on dispute open:
  //   DR 1190  Chargebacks Receivable      disputedAmountMinor
  //   DR 5100  Payment Processing Fees     feeAmountMinor  (only if > 0)
  //   CR 1130  Merchant Settlement         disputedAmountMinor + feeAmountMinor
  //
  // Concurrency controls:
  //   - Pessimistic FOR UPDATE lock on PaymentEntity before validating amounts.
  //   - DisputeEntity insert uses UNIQUE constraint as final idempotency gate.
  //   - totalActiveDisputedAmount is computed inside the locked transaction.

  async openDispute(
    dto:      OpenDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const openedAt = new Date(dto.openedAt);
    const now      = new Date();

    // Period check — read-only, before the transaction
    await this.periodService.assertOpen(tenantId, openedAt);

    const disputeNumber = await this.disputeRepository.nextDisputeNumber(tenantId);

    const dispute = await this.dataSource.transaction(async (manager) => {
      // ── Lock payment row ────────────────────────────────────────────────
      const payment = await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id',           { id: dto.paymentId })
        .andWhere('p.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!payment) {
        throw new BadRequestException(`Payment ${dto.paymentId} not found`);
      }
      if (payment.status !== 'captured' && payment.status !== 'chargedback') {
        throw new BadRequestException(
          `Cannot open dispute on payment with status "${payment.status}". ` +
          `Payment must be captured.`,
        );
      }
      if (dto.disputedAmountMinor <= 0) {
        throw new BadRequestException('disputedAmountMinor must be > 0');
      }
      if (dto.disputedAmountMinor > payment.capturedAmountMinor) {
        throw new BadRequestException(
          `disputedAmountMinor (${dto.disputedAmountMinor}) exceeds ` +
          `payment capturedAmountMinor (${payment.capturedAmountMinor})`,
        );
      }

      // ── Cumulative dispute guard (within locked transaction) ────────────
      // Prevent multiple disputes on the same payment exceeding capturedAmount.
      const alreadyDisputed = await this.disputeRepository.totalActiveDisputedAmount(
        dto.paymentId, tenantId, manager,
      );
      if (alreadyDisputed + dto.disputedAmountMinor > payment.capturedAmountMinor) {
        throw new BadRequestException(
          `Opening this dispute would bring total disputed amount ` +
          `(${alreadyDisputed + dto.disputedAmountMinor}) above ` +
          `capturedAmountMinor (${payment.capturedAmountMinor})`,
        );
      }

      // ── Build journal lines ─────────────────────────────────────────────
      const totalCr = dto.disputedAmountMinor + dto.feeAmountMinor;
      const journalLines = [
        {
          accountCode: GL.CHARGEBACKS_RECEIVABLE,
          debitMinor:  dto.disputedAmountMinor,
          creditMinor: 0,
          currency:    dto.currency,
          description: `Chargeback receivable — ${disputeNumber}`,
        },
        ...(dto.feeAmountMinor > 0 ? [{
          accountCode: GL.PROCESSING_FEES,
          debitMinor:  dto.feeAmountMinor,
          creditMinor: 0,
          currency:    dto.currency,
          description: `Chargeback fee — ${disputeNumber}`,
        }] : []),
        {
          accountCode: GL.MERCHANT_SETTLEMENT,
          debitMinor:  0,
          creditMinor: totalCr,
          currency:    dto.currency,
          description: `Funds withdrawn — dispute ${disputeNumber}`,
        },
      ];

      // ── Post journal via DoubleEntryService boundary ────────────────────
      const entry = await this.doubleEntryService.postWithManager(
        {
          tenantId,
          entryType:   'chargeback',
          sourceType:  'dispute',
          sourceId:    dto.paymentId,
          description: `Dispute opened — ${disputeNumber} — gateway: ${dto.gatewayDisputeId}`,
          postedAt:    openedAt,
          currency:    dto.currency,
          lines:       journalLines,
        },
        manager,
      );

      // ── Insert dispute row ──────────────────────────────────────────────
      // UNIQUE (tenant_id, gateway, gateway_dispute_id) is the final idempotency gate.
      const d = await this.disputeRepository.create(
        {
          tenantId,
          disputeNumber,
          paymentId:           dto.paymentId,
          gateway:             dto.gateway,
          gatewayDisputeId:    dto.gatewayDisputeId,
          reason:              dto.reason,
          disputedAmountMinor: dto.disputedAmountMinor,
          feeAmountMinor:      dto.feeAmountMinor,
          currency:            dto.currency,
          openedAt,
          evidenceDueAt:       dto.evidenceDueAt ? new Date(dto.evidenceDueAt) : undefined,
          metadata:            dto.metadata,
          createdById:         actorId,
        },
        manager,
      );

      // Update dispute with journalEntryId atomically
      await this.disputeRepository.update(
        d.id, tenantId,
        { journalEntryId: entry.id, updatedById: actorId },
        manager,
      );
      d.journalEntryId = entry.id;

      // ── Update payment status ───────────────────────────────────────────
      // Mark payment as 'chargedback' only when the full captured amount is disputed.
      // Partial disputes leave the payment in 'captured' status.
      const willFullyChargeback =
        alreadyDisputed + dto.disputedAmountMinor === payment.capturedAmountMinor;

      if (willFullyChargeback && payment.status === 'captured') {
        await manager.update(PaymentEntity, { id: dto.paymentId, tenantId }, {
          status:      'chargedback',
          updatedById: actorId,
        });
      }

      return d;
    });

    await this.eventEmitter.emitAsync(DisputeEvents.OPENED, {
      tenantId,
      disputeId:           dispute.id,
      disputeNumber:       dispute.disputeNumber,
      paymentId:           dispute.paymentId,
      gatewayDisputeId:    dispute.gatewayDisputeId,
      disputedAmountMinor: dispute.disputedAmountMinor,
      currency:            dispute.currency,
      status:              'opened',
      feeAmountMinor:      dispute.feeAmountMinor,
      reason:              dispute.reason,
      evidenceDueAt:       dispute.evidenceDueAt?.toISOString() ?? null,
      journalEntryId:      dispute.journalEntryId!,
      timestamp:           new Date().toISOString(),
    } as DisputeOpenedPayload);

    this.logger.log(
      `openDispute: ${dispute.disputeNumber} opened for payment ${dto.paymentId} ` +
      `(${dto.disputedAmountMinor} ${dto.currency}) — tenant ${tenantId}`,
    );

    return dispute;
  }

  // ── markUnderReview() ─────────────────────────────────────────────────────

  async markUnderReview(
    id:       string,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(dispute.status, 'under_review');

    await this.disputeRepository.update(id, tenantId, {
      status:      'under_review',
      updatedById: actorId,
    });

    const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(DisputeEvents.UNDER_REVIEW, {
      tenantId,
      disputeId:           id,
      disputeNumber:       updated.disputeNumber,
      paymentId:           updated.paymentId,
      gatewayDisputeId:    updated.gatewayDisputeId,
      disputedAmountMinor: updated.disputedAmountMinor,
      currency:            updated.currency,
      status:              'under_review',
      timestamp:           new Date().toISOString(),
    });

    return updated;
  }

  // ── resolveWon() ──────────────────────────────────────────────────────────
  //
  // Accounting journal on dispute won (funds recovered):
  //   DR 1130  Merchant Settlement         disputedAmountMinor (+ fee if recovered)
  //   CR 1190  Chargebacks Receivable      disputedAmountMinor
  //   (Fee recovery: if the gateway returns the fee, include it in the DR/CR above.
  //    For simplicity in this model, fee is not recovered separately unless
  //    a future batch tracks fee recovery from the gateway.)

  async resolveWon(
    id:       string,
    dto:      ResolveDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(dispute.status, 'won');

    if (dispute.resolutionJournalEntryId) {
      throw new ConflictException(
        `Dispute ${id} already has a resolution journal entry — duplicate resolution attempt`,
      );
    }

    const resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : new Date();
    await this.periodService.assertOpen(tenantId, resolvedAt);

    const resolutionEntry = await this.dataSource.transaction(async (manager) => {
      // Lock the dispute row under the transaction
      const locked = await manager
        .createQueryBuilder(DisputeEntity, 'd')
        .setLock('pessimistic_write')
        .where('d.id = :id',           { id })
        .andWhere('d.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!locked) throw new BadRequestException(`Dispute ${id} not found`);
      if (locked.resolutionJournalEntryId) {
        throw new ConflictException(`Dispute ${id} already resolved — concurrent request`);
      }
      assertTransitionAllowed(locked.status, 'won');

      const entry = await this.doubleEntryService.postWithManager(
        {
          tenantId,
          entryType:   'chargeback',
          sourceType:  'dispute',
          sourceId:    id,
          description: `Dispute won — ${locked.disputeNumber}`,
          postedAt:    resolvedAt,
          currency:    locked.currency,
          lines: [
            {
              accountCode: GL.MERCHANT_SETTLEMENT,
              debitMinor:  locked.disputedAmountMinor,
              creditMinor: 0,
              currency:    locked.currency,
              description: `Funds recovered — ${locked.disputeNumber}`,
            },
            {
              accountCode: GL.CHARGEBACKS_RECEIVABLE,
              debitMinor:  0,
              creditMinor: locked.disputedAmountMinor,
              currency:    locked.currency,
              description: `Chargeback receivable cleared — ${locked.disputeNumber}`,
            },
          ],
        },
        manager,
      );

      await manager.update(DisputeEntity, { id, tenantId }, {
        status:                    'won',
        resolution:                'won',
        resolvedAt,
        resolutionJournalEntryId:  entry.id,
        updatedById:               actorId,
      });

      // Restore payment status to 'captured' if it was fully chargedback and now won
      const payment = await manager.findOne(PaymentEntity, {
        where: { id: locked.paymentId, tenantId },
      });
      if (payment?.status === 'chargedback') {
        await manager.update(PaymentEntity, { id: locked.paymentId, tenantId }, {
          status:      'captured',
          updatedById: actorId,
        });
      }

      return entry;
    });

    const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(DisputeEvents.WON, {
      tenantId,
      disputeId:                id,
      disputeNumber:            updated.disputeNumber,
      paymentId:                updated.paymentId,
      gatewayDisputeId:         updated.gatewayDisputeId,
      disputedAmountMinor:      updated.disputedAmountMinor,
      currency:                 updated.currency,
      status:                   'won',
      resolutionJournalEntryId: resolutionEntry.id,
      timestamp:                new Date().toISOString(),
    } as DisputeWonPayload);

    this.logger.log(
      `resolveWon: dispute ${updated.disputeNumber} won — ` +
      `${updated.disputedAmountMinor} ${updated.currency} recovered — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── resolveLost() ─────────────────────────────────────────────────────────
  //
  // Accounting journal on dispute lost (funds permanently forfeited):
  //   DR 5210  Chargeback Expense         disputedAmountMinor
  //   CR 1190  Chargebacks Receivable     disputedAmountMinor
  //
  // The disputed receivable is written off against Chargeback Expense.
  // The original capture journal and the dispute-open journal remain unchanged
  // (immutable ledger rule). Only a new expense entry is posted.

  async resolveLost(
    id:       string,
    dto:      ResolveDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(dispute.status, 'lost');

    if (dispute.resolutionJournalEntryId) {
      throw new ConflictException(
        `Dispute ${id} already has a resolution journal entry — duplicate resolution attempt`,
      );
    }

    const resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : new Date();
    await this.periodService.assertOpen(tenantId, resolvedAt);

    const resolutionEntry = await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(DisputeEntity, 'd')
        .setLock('pessimistic_write')
        .where('d.id = :id',           { id })
        .andWhere('d.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!locked) throw new BadRequestException(`Dispute ${id} not found`);
      if (locked.resolutionJournalEntryId) {
        throw new ConflictException(`Dispute ${id} already resolved — concurrent request`);
      }
      assertTransitionAllowed(locked.status, 'lost');

      const entry = await this.doubleEntryService.postWithManager(
        {
          tenantId,
          entryType:   'chargeback',
          sourceType:  'dispute',
          sourceId:    id,
          description: `Dispute lost — write-off — ${locked.disputeNumber}`,
          postedAt:    resolvedAt,
          currency:    locked.currency,
          lines: [
            {
              accountCode: GL.CHARGEBACK_EXPENSE,
              debitMinor:  locked.disputedAmountMinor,
              creditMinor: 0,
              currency:    locked.currency,
              description: `Chargeback loss — ${locked.disputeNumber}`,
            },
            {
              accountCode: GL.CHARGEBACKS_RECEIVABLE,
              debitMinor:  0,
              creditMinor: locked.disputedAmountMinor,
              currency:    locked.currency,
              description: `Chargeback receivable written off — ${locked.disputeNumber}`,
            },
          ],
        },
        manager,
      );

      await manager.update(DisputeEntity, { id, tenantId }, {
        status:                    'lost',
        resolution:                'lost',
        resolvedAt,
        resolutionJournalEntryId:  entry.id,
        updatedById:               actorId,
      });

      // Payment remains 'chargedback' when lost — funds are permanently gone.
      // A future Refund aggregate handles whether any refund is due to the customer.

      return entry;
    });

    const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(DisputeEvents.LOST, {
      tenantId,
      disputeId:                id,
      disputeNumber:            updated.disputeNumber,
      paymentId:                updated.paymentId,
      gatewayDisputeId:         updated.gatewayDisputeId,
      disputedAmountMinor:      updated.disputedAmountMinor,
      currency:                 updated.currency,
      status:                   'lost',
      resolutionJournalEntryId: resolutionEntry.id,
      timestamp:                new Date().toISOString(),
    } as DisputeLostPayload);

    this.logger.log(
      `resolveLost: dispute ${updated.disputeNumber} lost — ` +
      `${updated.disputedAmountMinor} ${updated.currency} written off — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── cancelDispute() ───────────────────────────────────────────────────────
  //
  // Cancellation does NOT reverse the open journal — if funds were actually
  // withdrawn by the gateway, a won resolution is the correct path.
  // Cancel is for disputes that were opened in error or withdrawn before
  // any funds movement (e.g. a pre-chargeback inquiry that was resolved).
  // If journalEntryId is set (funds were already moved), we post a reversal.

  async cancelDispute(
    id:       string,
    dto:      CancelDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findByIdOrFail(id, tenantId);
    assertTransitionAllowed(dispute.status, 'cancelled');

    const now = new Date();

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager
        .createQueryBuilder(DisputeEntity, 'd')
        .setLock('pessimistic_write')
        .where('d.id = :id',           { id })
        .andWhere('d.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!locked) throw new BadRequestException(`Dispute ${id} not found`);
      assertTransitionAllowed(locked.status, 'cancelled');

      // If the open journal was already posted, reverse it (funds were not actually moved,
      // or were returned without a formal 'won' resolution).
      if (locked.journalEntryId) {
        const reversal = await this.doubleEntryService.reverse(
          locked.journalEntryId,
          tenantId,
          `Dispute cancelled — ${locked.disputeNumber}: ${dto.reason ?? 'no reason'}`,
          actorId,
          now,
        );
        await manager.update(DisputeEntity, { id, tenantId }, {
          resolutionJournalEntryId: reversal.id,
        });
      }

      await manager.update(DisputeEntity, { id, tenantId }, {
        status:      'cancelled',
        resolution:  'cancelled',
        resolvedAt:  now,
        updatedById: actorId,
      });

      // Restore payment status if the only chargeback on it is this cancelled dispute
      const payment = await manager.findOne(PaymentEntity, {
        where: { id: locked.paymentId, tenantId },
      });
      if (payment?.status === 'chargedback') {
        const remaining = await this.disputeRepository.totalActiveDisputedAmount(
          locked.paymentId, tenantId, manager,
        );
        if (remaining === 0) {
          await manager.update(PaymentEntity, { id: locked.paymentId, tenantId }, {
            status:      'captured',
            updatedById: actorId,
          });
        }
      }
    });

    const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(DisputeEvents.CANCELLED, {
      tenantId,
      disputeId:           id,
      disputeNumber:       updated.disputeNumber,
      paymentId:           updated.paymentId,
      gatewayDisputeId:    updated.gatewayDisputeId,
      disputedAmountMinor: updated.disputedAmountMinor,
      currency:            updated.currency,
      status:              'cancelled',
      reason:              dto.reason ?? null,
      timestamp:           now.toISOString(),
    } as DisputeCancelledPayload);

    this.logger.log(
      `cancelDispute: dispute ${updated.disputeNumber} cancelled — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── Read paths ────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<DisputeEntity> {
    return this.disputeRepository.findByIdOrFail(id, tenantId);
  }

  async findByGatewayDisputeId(
    gateway: string, gatewayDisputeId: string, tenantId: string,
  ): Promise<DisputeEntity | null> {
    return this.disputeRepository.findByGatewayDisputeId(gateway, gatewayDisputeId, tenantId);
  }

  async findByPayment(paymentId: string, tenantId: string): Promise<DisputeEntity[]> {
    return this.disputeRepository.findByPayment(paymentId, tenantId);
  }

  async findAll(
    tenantId: string,
    opts: { status?: DisputeStatus; limit?: number; offset?: number } = {},
  ): Promise<DisputeEntity[]> {
    return this.disputeRepository.findAll(tenantId, opts);
  }
}
