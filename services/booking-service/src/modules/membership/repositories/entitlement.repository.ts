import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                      from '@nestjs/typeorm';
import { DataSource, type EntityManager }        from 'typeorm';
import type { QueryDeepPartialEntity }           from 'typeorm/query-builder/QueryPartialEntity';
import { EntitlementBalanceEntity }              from '../entities/entitlement-balance.entity';
import { MembershipTransactionEntity }           from '../entities/membership-transaction.entity';
import { MembershipAuditLogEntity }              from '../entities/membership-audit-log.entity';

@Injectable()
export class EntitlementRepository {
  private readonly logger = new Logger(EntitlementRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get balanceRepo() {
    return this.dataSource.getRepository(EntitlementBalanceEntity);
  }

  // ── Balance reads ─────────────────────────────────────────────────────────

  async findByMembership(
    membershipId: string,
    tenantId:     string,
  ): Promise<EntitlementBalanceEntity[]> {
    return this.balanceRepo.find({
      where: { membershipId, tenantId },
      order: { benefitType: 'ASC' },
    });
  }

  async findByBenefitType(
    membershipId: string,
    benefitType:  string,
    tenantId:     string,
  ): Promise<EntitlementBalanceEntity | null> {
    return this.balanceRepo.findOne({
      where: { membershipId, benefitType, tenantId },
    });
  }

  async findByBenefitTypeOrFail(
    membershipId: string,
    benefitType:  string,
    tenantId:     string,
  ): Promise<EntitlementBalanceEntity> {
    const b = await this.findByBenefitType(membershipId, benefitType, tenantId);
    if (!b) {
      throw new NotFoundException(
        `Entitlement balance for benefit "${benefitType}" not found on membership ${membershipId}`,
      );
    }
    return b;
  }

  async create(data: Partial<EntitlementBalanceEntity>): Promise<EntitlementBalanceEntity> {
    return this.balanceRepo.save(this.balanceRepo.create(data));
  }

  async update(
    id:   string,
    data: QueryDeepPartialEntity<EntitlementBalanceEntity>,
  ): Promise<void> {
    await this.balanceRepo.update({ id }, data);
  }

  // ── Pessimistic locking ────────────────────────────────────────────────────

  /**
   * Acquires a FOR UPDATE row lock on the entitlement balance row.
   * Must be called within an existing EntityManager transaction.
   *
   * Pattern mirrors SlotRepository.lockAndVerifyAvailable used in booking creation.
   * The caller checks the balance and decrements atomically within the same
   * transaction — no other concurrent transaction can read-modify-write
   * the same row between the lock and the update.
   */
  async lockBalance(
    membershipId: string,
    benefitType:  string,
    tenantId:     string,
    manager:      EntityManager,
  ): Promise<EntitlementBalanceEntity | null> {
    const result = await manager
      .createQueryBuilder(EntitlementBalanceEntity, 'eb')
      .setLock('pessimistic_write')
      .where('eb.membershipId = :membershipId', { membershipId })
      .andWhere('eb.benefitType = :benefitType', { benefitType })
      .andWhere('eb.tenantId = :tenantId',       { tenantId })
      .getOne();

    return result;
  }

  // ── Ledger (reuses MembershipTransactionEntity) ───────────────────────────

  async insertTransaction(
    data:    Partial<MembershipTransactionEntity>,
    manager: EntityManager,
  ): Promise<MembershipTransactionEntity> {
    const repo = manager.getRepository(MembershipTransactionEntity);
    return repo.save(repo.create(data));
  }

  async insertAuditLog(
    data:    Partial<MembershipAuditLogEntity>,
    manager: EntityManager,
  ): Promise<MembershipAuditLogEntity> {
    const repo = manager.getRepository(MembershipAuditLogEntity);
    return repo.save(repo.create(data));
  }

  // ── Scheduler queries ─────────────────────────────────────────────────────

  /**
   * Balances due for a period reset (nextResetAt ≤ now, isActive = true).
   */
  async findDueForReset(batchSize = 100): Promise<EntitlementBalanceEntity[]> {
    return this.balanceRepo
      .createQueryBuilder('eb')
      .where('eb.nextResetAt <= :now',  { now: new Date() })
      .andWhere('eb.nextResetAt IS NOT NULL')
      .andWhere('eb.isActive = true')
      .orderBy('eb.nextResetAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Balances with outstanding reservations on inactive memberships.
   * Used to clean up stale reservedUnits after membership expiry.
   */
  async findStaleReservations(batchSize = 100): Promise<EntitlementBalanceEntity[]> {
    return this.balanceRepo
      .createQueryBuilder('eb')
      .where('eb.reservedUnits > 0')
      .andWhere('eb.isActive = false')
      .orderBy('eb.updatedAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Deactivates all balances for a membership (called on expire/cancel).
   */
  async deactivateByMembership(
    membershipId: string,
    tenantId:     string,
    manager:      EntityManager,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .update(EntitlementBalanceEntity)
      .set({ isActive: false, reservedUnits: 0 })
      .where('membershipId = :membershipId', { membershipId })
      .andWhere('tenantId = :tenantId',     { tenantId })
      .execute();
  }
}
