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

// ── GL accounts ───────────────────────────────────────────────────────────────
// All verified against existing system CoA seeder. No new accounts needed.
//
//   1130  Merchant Settlement Account  (asset)   — gateway clearing
//   1190  Chargebacks Receivable       (asset)   — disputed funds owed back to merchant
//   5100  Payment Processing Fees      (expense) — chargeback fee cost
//   5210  Chargeback Expense           (expense) — write-off when dispute lost

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

// ── Payment status helper ─────────────────────────────────────────────────────
//
// A payment in 'chargedback' status can be restored to 'captured' ONLY when:
//   (a) No disputes are still in-flight (opened or under_review), AND
//   (b) No disputes were permanently lost (totalLostAmount = 0).
//
// Rationale:
//   - A won dispute means funds were recovered — does not preclude restoration.
//   - A lost dispute means funds are permanently forfeited — payment MUST stay
//     chargedback regardless of other dispute outcomes.
//   - Multiple disputes: even if dispute A is won, if dispute B is lost,
//     the payment remains chargedback.

async function canRestorePaymentToCaptured(
  disputeRepository: DisputeRepository,
  paymentId: string,
  tenantId:  string,
  manager:   import('typeorm').EntityManager,
): Promise<boolean> {
  const [lostAmount, openCount] = await Promise.all([
    disputeRepository.totalLostDisputedAmount(paymentId, tenantId, manager),
    disputeRepository.countOpenDisputesForPayment(paymentId, tenantId, manager),
  ]);
  return lostAmount === 0 && openCount === 0;
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
  // Accounting journal:
  //   DR 1190  Chargebacks Receivable      disputedAmountMinor
  //   DR 5100  Payment Processing Fees     feeAmountMinor  (only if > 0)
  //   CR 1130  Merchant Settlement         disputedAmountMinor + feeAmountMinor
  //
  // Payment status:
  //   Marked 'chargedback' ONLY when the newly opened dispute, combined with
  //   existing NON-CANCELLED disputes (including won/lost), equals the full
  //   capturedAmountMinor. Won disputes are included in the ceiling check
  //   because the gateway has a record of the original dispute — a new dispute
  //   cannot exceed the original captured amount regardless of prior outcomes.
  //
  // FIX for willFullyChargeback (Defect 2b):
  //   Use totalActiveDisputedAmount (excludes 'cancelled') which already
  //   includes won/lost/opened/under_review — this is correct for the ceiling
  //   check (prevents over-disputing). But for the payment status transition,
  //   we only mark 'chargedback' on the FIRST time the full amount is disputed
  //   via a new open dispute — won disputes don't de-trigger chargedback because
  //   we use the cumulative total to detect the threshold crossing.
  //   After a won dispute, the payment would already have been restored to
  //   'captured' by resolveWon() — so opening a new dispute on a 'captured'
  //   payment resets the lifecycle correctly.

  async openDispute(
    dto:      OpenDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const openedAt = new Date(dto.openedAt);

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

      // ── Cumulative dispute ceiling guard ────────────────────────────────
      // Includes won/lost/opened/under_review. Excludes only cancelled.
      // Prevents opening a dispute that would exceed the captured amount.
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

      await this.disputeRepository.update(
        d.id, tenantId,
        { journalEntryId: entry.id, updatedById: actorId },
        manager,
      );
      d.journalEntryId = entry.id;

      // ── Payment status: chargedback only when full amount newly disputed ─
      // Mark chargedback when this is the first time the cumulative non-cancelled
      // disputed total reaches capturedAmountMinor AND payment is still 'captured'.
      // (If payment is already 'chargedback' from a prior dispute, no change needed.)
      const newTotal = alreadyDisputed + dto.disputedAmountMinor;
      if (newTotal === payment.capturedAmountMinor && payment.status === 'captured') {
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
      `(${dispute.disputedAmountMinor} ${dispute.currency}) — tenant ${tenantId}`,
    );

    return dispute;
  }

  // ── markUnderReview() ─────────────────────────────────────────────────────
  // No payment status change. No journal entry.

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
  // Accounting journal — funds recovered:
  //   DR 1130  Merchant Settlement         disputedAmountMinor
  //   CR 1190  Chargebacks Receivable      disputedAmountMinor
  //
  // FIX for Defect 2a + 2d:
  //   Payment row is now locked (FOR UPDATE) before reading status.
  //   Payment is restored to 'captured' ONLY when:
  //     (a) totalLostDisputedAmount = 0 (no permanently forfeited disputes), AND
  //     (b) countOpenDisputesForPayment = 0 (no in-flight disputes remain).
  //   This is evaluated AFTER the current dispute is marked 'won' so the counts
  //   reflect the final state.

  async resolveWon(
    id:       string,
    dto:      ResolveDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : new Date();
    await this.periodService.assertOpen(tenantId, resolvedAt);

    const resolutionEntry = await this.dataSource.transaction(async (manager) => {
      // ── Lock dispute row ────────────────────────────────────────────────
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

      // ── Lock payment row — Defect 2d fix ────────────────────────────────
      const payment = await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id',           { id: locked.paymentId })
        .andWhere('p.tenantId = :tid', { tid: tenantId })
        .getOne();

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
        status:                   'won',
        resolution:               'won',
        resolvedAt,
        resolutionJournalEntryId: entry.id,
        updatedById:              actorId,
      });

      // ── Payment status — Defect 2a fix ──────────────────────────────────
      // Restore to 'captured' only when no lost disputes AND no open disputes remain.
      // The current dispute is now 'won' (updated above), so aggregate queries
      // reflect the post-resolution state.
      if (payment?.status === 'chargedback') {
        const restore = await canRestorePaymentToCaptured(
          this.disputeRepository, locked.paymentId, tenantId, manager,
        );
        if (restore) {
          await manager.update(PaymentEntity, { id: locked.paymentId, tenantId }, {
            status:      'captured',
            updatedById: actorId,
          });
        }
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
  // Accounting journal — write-off:
  //   DR 5210  Chargeback Expense         disputedAmountMinor
  //   CR 1190  Chargebacks Receivable     disputedAmountMinor
  //
  // Payment status:
  //   Payment REMAINS 'chargedback'. Funds are permanently forfeited.
  //   No restoration — totalLostDisputedAmount will be > 0 for this payment
  //   forever, so canRestorePaymentToCaptured() will return false.
  //   Lock payment row for consistency with resolveWon() (Defect 2d fix).

  async resolveLost(
    id:       string,
    dto:      ResolveDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
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

      // Lock payment row for consistent concurrent access
      await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id',           { id: locked.paymentId })
        .andWhere('p.tenantId = :tid', { tid: tenantId })
        .getOne();

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
        status:                   'lost',
        resolution:               'lost',
        resolvedAt,
        resolutionJournalEntryId: entry.id,
        updatedById:              actorId,
      });

      // Payment intentionally left as 'chargedback' — funds permanently forfeited.
      // canRestorePaymentToCaptured() will always return false for this payment
      // because totalLostDisputedAmount >= disputedAmountMinor > 0.

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
  // ISSUE 1 FIX — Fee accounting on cancellation:
  //
  // The previous implementation called DoubleEntryService.reverse() on the
  // opening journal, which blindly mirrors ALL lines including the fee expense.
  // This would credit 5100 (Payment Processing Fees), incorrectly implying
  // the chargeback fee was refunded.
  //
  // CORRECT TREATMENT FOR V1:
  // The chargeback fee is treated as a sunk cost. It is NOT reversed.
  // Only the principal (disputedAmountMinor) flows are reversed:
  //
  //   CR 1130  Merchant Settlement       disputedAmountMinor  (funds released back)
  //   DR 1190  Chargebacks Receivable    disputedAmountMinor  (receivable cleared)
  //
  // The fee expense (DR 5100 from open) remains on the books permanently.
  // If the gateway exceptionally refunds the fee, a separate manual adjustment
  // journal (DR 1130 / CR 5100 or DR 1130 / CR 4900) can be posted via the
  // finance admin journal endpoint.
  //
  // Payment status:
  //   Restored to 'captured' only when no lost disputes AND no open disputes remain
  //   (canRestorePaymentToCaptured). Payment row locked (Defect 2d fix).

  async cancelDispute(
    id:       string,
    dto:      CancelDisputeDto,
    tenantId: string,
    actorId:  string,
  ): Promise<DisputeEntity> {
    const now = new Date();
    await this.periodService.assertOpen(tenantId, now);

    await this.dataSource.transaction(async (manager) => {
      // ── Lock dispute row ────────────────────────────────────────────────
      const locked = await manager
        .createQueryBuilder(DisputeEntity, 'd')
        .setLock('pessimistic_write')
        .where('d.id = :id',           { id })
        .andWhere('d.tenantId = :tid', { tid: tenantId })
        .getOne();

      if (!locked) throw new BadRequestException(`Dispute ${id} not found`);
      assertTransitionAllowed(locked.status, 'cancelled');

      // ── Lock payment row ────────────────────────────────────────────────
      await manager
        .createQueryBuilder(PaymentEntity, 'p')
        .setLock('pessimistic_write')
        .where('p.id = :id',           { id: locked.paymentId })
        .andWhere('p.tenantId = :tid', { tid: tenantId })
        .getOne();

      // ── Targeted principal reversal — Issue 1 fix ───────────────────────
      // Post the reversal of ONLY the principal lines. Fee expense stays.
      // This is a new journal entry (not a reversal of the opening entry).
      if (locked.journalEntryId) {
        const reversalEntry = await this.doubleEntryService.postWithManager(
          {
            tenantId,
            entryType:   'chargeback',
            sourceType:  'dispute',
            sourceId:    id,
            description: `Dispute cancelled — principal released — ${locked.disputeNumber}`,
            postedAt:    now,
            currency:    locked.currency,
            lines: [
              {
                // DR the receivable to close it
                accountCode: GL.CHARGEBACKS_RECEIVABLE,
                debitMinor:  0,
                creditMinor: locked.disputedAmountMinor,
                currency:    locked.currency,
                description: `Chargeback receivable cancelled — ${locked.disputeNumber}`,
              },
              {
                // CR the settlement to return the principal
                accountCode: GL.MERCHANT_SETTLEMENT,
                debitMinor:  locked.disputedAmountMinor,
                creditMinor: 0,
                currency:    locked.currency,
                description: `Principal released — dispute ${locked.disputeNumber}`,
              },
            ],
          },
          manager,
        );

        await manager.update(DisputeEntity, { id, tenantId }, {
          resolutionJournalEntryId: reversalEntry.id,
        });
      }

      await manager.update(DisputeEntity, { id, tenantId }, {
        status:      'cancelled',
        resolution:  'cancelled',
        resolvedAt:  now,
        updatedById: actorId,
      });

      // ── Payment status ──────────────────────────────────────────────────
      // Restore to 'captured' only when all remaining disputes are resolved
      // (no lost, no open).
      const payment = await manager.findOne(PaymentEntity, {
        where: { id: locked.paymentId, tenantId },
      });
      if (payment?.status === 'chargedback') {
        const restore = await canRestorePaymentToCaptured(
          this.disputeRepository, locked.paymentId, tenantId, manager,
        );
        if (restore) {
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
