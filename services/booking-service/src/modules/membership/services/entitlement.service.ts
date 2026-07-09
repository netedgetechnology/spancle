import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 }        from '@nestjs/event-emitter';
import { InjectDataSource }     from '@nestjs/typeorm';
import { DataSource }           from 'typeorm';
import { EntitlementRepository } from '../repositories/entitlement.repository';
import { MembershipRepository }  from '../repositories/membership.repository';
import {
  MembershipEvents,
  type EntitlementConsumedPayload,
} from '../events/membership.events';
import { EntitlementBalanceEntity }  from '../entities/entitlement-balance.entity';
import type {
  ConsumeEntitlementDto,
  RefundEntitlementDto,
  AdjustEntitlementDto,
  ReserveEntitlementDto,
  ReleaseReservedEntitlementDto,
  InitialiseEntitlementDto,
} from '../dto/entitlement.dto';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Compute the next reset date from a period type and an anchor date. */
function nextResetDate(periodType: string, from: Date): Date {
  const d = new Date(from);
  switch (periodType) {
    case 'week':     d.setDate(d.getDate() + 7);   break;
    case 'month':    d.setMonth(d.getMonth() + 1);  break;
    case 'quarter':  d.setMonth(d.getMonth() + 3);  break;
    case 'year':     d.setFullYear(d.getFullYear() + 1); break;
    default:         return d; // membership_term / unknown → no scheduled reset
  }
  return d;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    private readonly entitlementRepository: EntitlementRepository,
    private readonly membershipRepository:  MembershipRepository,
    private readonly eventEmitter:          EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Initialise (called during enrolment / plan change) ────────────────────

  /**
   * Creates or resets an entitlement balance for a membership.
   * Called by MembershipService after enrolment for each benefit in the plan snapshot.
   */
  async initialise(
    membershipId: string,
    tenantId:     string,
    dto:          InitialiseEntitlementDto,
  ): Promise<EntitlementBalanceEntity> {
    const existing = await this.entitlementRepository.findByBenefitType(
      membershipId, dto.benefitType, tenantId,
    );

    const now       = new Date();
    const resetDate = dto.periodType && dto.periodType !== 'membership_term'
      ? nextResetDate(dto.periodType, now)
      : null;

    if (existing) {
      await this.entitlementRepository.update(existing.id, {
        balance:         dto.units,
        baseUnits:       dto.units,
        reservedUnits:   0,
        periodType:      dto.periodType ?? null,
        nextResetAt:     resetDate,
        rolloverAllowed: (dto.rolloverAllowed ?? 0) > 0,
        maxRolloverUnits: dto.maxRolloverUnits ?? null,
        isActive:        true,
      });
      return (await this.entitlementRepository.findByBenefitType(
        membershipId, dto.benefitType, tenantId,
      ))!;
    }

    return this.entitlementRepository.create({
      tenantId,
      membershipId,
      benefitType:       dto.benefitType,
      balance:           dto.units,
      baseUnits:         dto.units,
      reservedUnits:     0,
      periodType:        dto.periodType ?? null,
      nextResetAt:       resetDate,
      rolloverAllowed:   (dto.rolloverAllowed ?? 0) > 0,
      maxRolloverUnits:  dto.maxRolloverUnits ?? null,
      totalConsumedLifetime: 0,
      isActive:          true,
    });
  }

  // ── Read ──────────────────────────────────────────────────────────────────

  async findAll(
    membershipId: string,
    tenantId:     string,
  ): Promise<EntitlementBalanceEntity[]> {
    await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
    return this.entitlementRepository.findByMembership(membershipId, tenantId);
  }

  async findOne(
    membershipId: string,
    benefitType:  string,
    tenantId:     string,
  ): Promise<EntitlementBalanceEntity> {
    return this.entitlementRepository.findByBenefitTypeOrFail(
      membershipId, benefitType, tenantId,
    );
  }

  // ── Consume ───────────────────────────────────────────────────────────────

  /**
   * Atomically deducts units from an entitlement balance.
   *
   * Transaction flow:
   *   1. BEGIN
   *   2. SELECT ... FOR UPDATE on the balance row (pessimistic lock)
   *   3. Validate membership is active + balance sufficient
   *   4. Decrement balance, increment totalConsumedLifetime
   *   5. INSERT MembershipTransactionEntity row (immutable ledger)
   *   6. INSERT MembershipAuditLogEntity row
   *   7. COMMIT
   *   8. Emit ENTITLEMENT_CONSUMED (outside transaction)
   */
  async consume(
    membershipId: string,
    dto:          ConsumeEntitlementDto,
    tenantId:     string,
    actorId:      string,
  ): Promise<EntitlementBalanceEntity> {
    const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);

    if (membership.status !== 'active' && membership.status !== 'trial') {
      throw new BadRequestException(
        `Cannot consume entitlements on a membership with status "${membership.status}"`,
      );
    }

    let balanceAfter!: number;
    let balanceBefore!: number;
    let updatedBalance!: EntitlementBalanceEntity;

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.entitlementRepository.lockBalance(
        membershipId, dto.benefitType, tenantId, manager,
      );
      if (!locked) {
        throw new NotFoundException(
          `Entitlement balance for benefit "${dto.benefitType}" not found`,
        );
      }

      const effective = locked.balance - locked.reservedUnits;
      if (effective < dto.quantity) {
        throw new BadRequestException(
          `Insufficient entitlement balance: ${effective} available, ${dto.quantity} requested`,
        );
      }

      balanceBefore = locked.balance;
      balanceAfter  = locked.balance - dto.quantity;

      await manager.update(EntitlementBalanceEntity, { id: locked.id }, {
        balance:              balanceAfter,
        totalConsumedLifetime: locked.totalConsumedLifetime + dto.quantity,
      });

      await this.entitlementRepository.insertTransaction({
        tenantId,
        membershipId,
        userId:        membership.userId ?? actorId,
        transactionType: 'consume',
        benefitType:   dto.benefitType,
        quantityDelta: -dto.quantity,
        balanceBefore,
        balanceAfter,
        referenceType: dto.referenceType ?? null,
        referenceId:   dto.referenceId   ?? null,
        actorId,
        note:          dto.note     ?? null,
        metadata:      dto.metadata ?? null,
      }, manager);

      await this.entitlementRepository.insertAuditLog({
        tenantId,
        membershipId,
        action:         'entitlement_consumed',
        actorId,
        actorType:      'user',
        previousStatus: null,
        newStatus:      null,
        note:           `${dto.benefitType}: -${dto.quantity} (${balanceBefore} → ${balanceAfter})`,
      }, manager);
    });

    const result = await this.entitlementRepository.findByBenefitTypeOrFail(
      membershipId, dto.benefitType, tenantId,
    );
    updatedBalance = result;

    await this.eventEmitter.emitAsync(MembershipEvents.ENTITLEMENT_CONSUMED, {
      tenantId, membershipId,
      userId:        membership.userId,
      actorId,
      benefitType:   dto.benefitType,
      quantityDelta: -dto.quantity,
      balanceAfter,
      referenceType: dto.referenceType,
      referenceId:   dto.referenceId,
      timestamp:     new Date().toISOString(),
    } as EntitlementConsumedPayload & { referenceType?: string; referenceId?: string });

    if (balanceAfter === 0) {
      await this.eventEmitter.emitAsync(MembershipEvents.ENTITLEMENT_EXHAUSTED, {
        tenantId, membershipId, userId: membership.userId, actorId,
        benefitType:  dto.benefitType,
        quantityDelta: 0,
        balanceAfter:  0,
        timestamp: new Date().toISOString(),
      });
    }

    return updatedBalance;
  }

  // ── Refund ────────────────────────────────────────────────────────────────

  async refund(
    membershipId: string,
    dto:          RefundEntitlementDto,
    tenantId:     string,
    actorId:      string,
  ): Promise<EntitlementBalanceEntity> {
    const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);

    let balanceBefore!: number;
    let balanceAfter!:  number;

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.entitlementRepository.lockBalance(
        membershipId, dto.benefitType, tenantId, manager,
      );
      if (!locked) {
        throw new NotFoundException(
          `Entitlement balance for benefit "${dto.benefitType}" not found`,
        );
      }

      balanceBefore = locked.balance;
      balanceAfter  = locked.balance + dto.quantity;

      await manager.update(EntitlementBalanceEntity, { id: locked.id }, {
        balance: balanceAfter,
      });

      await this.entitlementRepository.insertTransaction({
        tenantId,
        membershipId,
        userId:         membership.userId ?? actorId,
        transactionType: 'refund',
        benefitType:    dto.benefitType,
        quantityDelta:  +dto.quantity,
        balanceBefore,
        balanceAfter,
        referenceId:    dto.originalTransactionId,
        referenceType:  'transaction',
        actorId,
        note:           dto.note ?? null,
      }, manager);

      await this.entitlementRepository.insertAuditLog({
        tenantId, membershipId, action: 'entitlement_refunded',
        actorId, actorType: 'user', previousStatus: null, newStatus: null,
        note: `${dto.benefitType}: +${dto.quantity} refund (${balanceBefore} → ${balanceAfter})`,
      }, manager);
    });

    await this.eventEmitter.emitAsync(MembershipEvents.ENTITLEMENT_REFUNDED, {
      tenantId, membershipId, userId: membership.userId, actorId,
      benefitType: dto.benefitType, quantityDelta: +dto.quantity, balanceAfter,
      timestamp: new Date().toISOString(),
    });

    return this.entitlementRepository.findByBenefitTypeOrFail(
      membershipId, dto.benefitType, tenantId,
    );
  }

  // ── Adjust (admin) ────────────────────────────────────────────────────────

  /**
   * Admin adjustment — signed delta, no balance floor check.
   * Balance is clamped to 0 minimum after adjustment.
   */
  async adjust(
    membershipId: string,
    dto:          AdjustEntitlementDto,
    tenantId:     string,
    actorId:      string,
  ): Promise<EntitlementBalanceEntity> {
    const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);

    let balanceBefore!: number;
    let balanceAfter!:  number;

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.entitlementRepository.lockBalance(
        membershipId, dto.benefitType, tenantId, manager,
      );
      if (!locked) {
        throw new NotFoundException(
          `Entitlement balance for benefit "${dto.benefitType}" not found`,
        );
      }

      balanceBefore = locked.balance;
      balanceAfter  = Math.max(0, locked.balance + dto.delta);

      await manager.update(EntitlementBalanceEntity, { id: locked.id }, {
        balance: balanceAfter,
      });

      await this.entitlementRepository.insertTransaction({
        tenantId,
        membershipId,
        userId:          membership.userId ?? actorId,
        transactionType: 'adjustment',
        benefitType:     dto.benefitType,
        quantityDelta:   dto.delta,
        balanceBefore,
        balanceAfter,
        actorId,
        note:            dto.note,
      }, manager);

      await this.entitlementRepository.insertAuditLog({
        tenantId, membershipId, action: 'entitlement_adjusted',
        actorId, actorType: 'staff', previousStatus: null, newStatus: null,
        note: `${dto.benefitType}: ${dto.delta > 0 ? '+' : ''}${dto.delta} (${balanceBefore} → ${balanceAfter}). ${dto.note}`,
      }, manager);
    });

    await this.eventEmitter.emitAsync(MembershipEvents.ENTITLEMENT_ADJUSTED, {
      tenantId, membershipId, userId: membership.userId, actorId,
      benefitType: dto.benefitType, quantityDelta: dto.delta, balanceAfter,
      timestamp: new Date().toISOString(),
    });

    return this.entitlementRepository.findByBenefitTypeOrFail(
      membershipId, dto.benefitType, tenantId,
    );
  }

  // ── Reserve ───────────────────────────────────────────────────────────────

  /**
   * Reserves units for an in-flight operation without consuming them.
   * Effective available = balance - reservedUnits.
   * The caller must call consume() or releaseReservation() to finalise.
   */
  async reserve(
    membershipId: string,
    dto:          ReserveEntitlementDto,
    tenantId:     string,
    actorId:      string,
  ): Promise<EntitlementBalanceEntity> {
    const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);

    if (membership.status !== 'active' && membership.status !== 'trial') {
      throw new BadRequestException(
        `Cannot reserve entitlements on a membership with status "${membership.status}"`,
      );
    }

    let balanceAfter!: number;

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.entitlementRepository.lockBalance(
        membershipId, dto.benefitType, tenantId, manager,
      );
      if (!locked) {
        throw new NotFoundException(
          `Entitlement balance for benefit "${dto.benefitType}" not found`,
        );
      }

      const available = locked.balance - locked.reservedUnits;
      if (available < dto.quantity) {
        throw new BadRequestException(
          `Cannot reserve ${dto.quantity} unit(s): only ${available} available`,
        );
      }

      balanceAfter = locked.reservedUnits + dto.quantity;

      await manager.update(EntitlementBalanceEntity, { id: locked.id }, {
        reservedUnits: balanceAfter,
      });

      await this.entitlementRepository.insertTransaction({
        tenantId, membershipId,
        userId:          membership.userId ?? actorId,
        transactionType: 'reserve',
        benefitType:     dto.benefitType,
        quantityDelta:   0,   // reservation does not change balance — only reservedUnits
        balanceBefore:   locked.balance,
        balanceAfter:    locked.balance,
        referenceType:   dto.referenceType ?? null,
        referenceId:     dto.referenceId   ?? null,
        actorId,
        note: `Reserved ${dto.quantity} unit(s)`,
      }, manager);
    });

    await this.eventEmitter.emitAsync(MembershipEvents.ENTITLEMENT_RESERVED, {
      tenantId, membershipId, userId: membership.userId, actorId,
      benefitType: dto.benefitType, quantityDelta: dto.quantity,
      balanceAfter, timestamp: new Date().toISOString(),
    });

    return this.entitlementRepository.findByBenefitTypeOrFail(
      membershipId, dto.benefitType, tenantId,
    );
  }

  // ── Release reservation ───────────────────────────────────────────────────

  async releaseReservation(
    membershipId: string,
    dto:          ReleaseReservedEntitlementDto,
    tenantId:     string,
    actorId:      string,
  ): Promise<EntitlementBalanceEntity> {
    const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.entitlementRepository.lockBalance(
        membershipId, dto.benefitType, tenantId, manager,
      );
      if (!locked) {
        throw new NotFoundException(
          `Entitlement balance for benefit "${dto.benefitType}" not found`,
        );
      }

      const newReserved = Math.max(0, locked.reservedUnits - dto.quantity);

      await manager.update(EntitlementBalanceEntity, { id: locked.id }, {
        reservedUnits: newReserved,
      });

      await this.entitlementRepository.insertTransaction({
        tenantId, membershipId,
        userId:          membership.userId ?? actorId,
        transactionType: 'release',
        benefitType:     dto.benefitType,
        quantityDelta:   0,
        balanceBefore:   locked.balance,
        balanceAfter:    locked.balance,
        referenceType:   dto.referenceType ?? null,
        referenceId:     dto.referenceId   ?? null,
        actorId,
        note: dto.note ?? `Released ${dto.quantity} reserved unit(s)`,
      }, manager);
    });

    await this.eventEmitter.emitAsync(MembershipEvents.ENTITLEMENT_RELEASED, {
      tenantId, membershipId, userId: membership.userId, actorId,
      benefitType: dto.benefitType, quantityDelta: -dto.quantity,
      balanceAfter: 0, timestamp: new Date().toISOString(),
    });

    return this.entitlementRepository.findByBenefitTypeOrFail(
      membershipId, dto.benefitType, tenantId,
    );
  }

  // ── Reset (called by scheduler) ───────────────────────────────────────────

  /**
   * Resets a single entitlement balance to its base units + rollover.
   * Inserts a ledger transaction and emits ENTITLEMENT_BALANCE_RESET.
   */
  async resetBalance(
    balance:  EntitlementBalanceEntity,
    actorId = 'system',
  ): Promise<void> {
    const rollover = balance.rolloverAllowed
      ? Math.min(balance.balance, balance.maxRolloverUnits ?? Infinity)
      : 0;

    const newBalance = balance.baseUnits + rollover;
    const now        = new Date();
    const nextReset  = balance.periodType && balance.periodType !== 'membership_term'
      ? nextResetDate(balance.periodType, now)
      : null;

    await this.dataSource.transaction(async (manager) => {
      const locked = await this.entitlementRepository.lockBalance(
        balance.membershipId, balance.benefitType, balance.tenantId, manager,
      );
      if (!locked) return; // balance removed concurrently — safe to skip

      await manager.update(EntitlementBalanceEntity, { id: locked.id }, {
        balance:     newBalance,
        lastResetAt: now,
        nextResetAt: nextReset,
      });

      await this.entitlementRepository.insertTransaction({
        tenantId:        balance.tenantId,
        membershipId:    balance.membershipId,
        userId:          actorId,
        transactionType: 'reset',
        benefitType:     balance.benefitType,
        quantityDelta:   newBalance - locked.balance,
        balanceBefore:   locked.balance,
        balanceAfter:    newBalance,
        actorId,
        note: `Period reset: base=${balance.baseUnits} rollover=${rollover}`,
      }, manager);

      await this.entitlementRepository.insertAuditLog({
        tenantId:      balance.tenantId,
        membershipId:  balance.membershipId,
        action:        'entitlement_balance_reset',
        actorId, actorType: 'system',
        previousStatus: null, newStatus: null,
        note: `${balance.benefitType}: reset to ${newBalance} (rollover=${rollover})`,
      }, manager);
    });

    await this.eventEmitter.emitAsync(MembershipEvents.ENTITLEMENT_BALANCE_RESET, {
      tenantId:      balance.tenantId,
      membershipId:  balance.membershipId,
      userId:        null,
      actorId,
      benefitType:   balance.benefitType,
      quantityDelta: newBalance - balance.balance,
      balanceAfter:  newBalance,
      timestamp: now.toISOString(),
    });
  }

  // ── Scheduler batch methods ───────────────────────────────────────────────

  /** Resets all balances due for a period reset. Called by scheduler. */
  async autoResetDueBalances(): Promise<number> {
    const batchSize = 100;
    const candidates = await this.entitlementRepository.findDueForReset(batchSize);
    let count = 0;
    for (const b of candidates) {
      try {
        await this.resetBalance(b);
        count++;
      } catch (err) {
        this.logger.warn(`autoResetDueBalances: ${b.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoResetDueBalances: reset ${count} balance(s)`);
    return count;
  }

  /** Clears stale reservedUnits on inactive memberships. Called by scheduler. */
  async autoReleaseStaleReservations(): Promise<number> {
    const candidates = await this.entitlementRepository.findStaleReservations(100);
    let count = 0;
    for (const b of candidates) {
      try {
        await this.entitlementRepository.update(b.id, { reservedUnits: 0 });
        count++;
      } catch (err) {
        this.logger.warn(`autoReleaseStaleReservations: ${b.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoReleaseStaleReservations: cleared ${count} stale reservation(s)`);
    return count;
  }

  /** Deactivates all entitlements for a membership (on expiry/cancellation). */
  async deactivateAll(
    membershipId: string,
    tenantId:     string,
    actorId:      string,
  ): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await this.entitlementRepository.deactivateByMembership(membershipId, tenantId, manager);
      await this.entitlementRepository.insertAuditLog({
        tenantId, membershipId, action: 'entitlements_deactivated',
        actorId, actorType: 'system', previousStatus: null, newStatus: null,
        note: 'All entitlement balances deactivated on membership termination',
      }, manager);
    });
    this.logger.log(`Entitlements deactivated — membership: ${membershipId}`);
  }
}
