import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                      from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder }   from 'typeorm';
import type { QueryDeepPartialEntity }           from 'typeorm/query-builder/QueryPartialEntity';
import {
  MembershipEntity,
  type MembershipStatus,
} from '../entities/membership.entity';
import { MembershipTransactionEntity } from '../entities/membership-transaction.entity';
import { MembershipAuditLogEntity }    from '../entities/membership-audit-log.entity';

export interface MembershipQueryParams {
  tenantId:   string;
  userId?:    string;
  planId?:    string;
  status?:    MembershipStatus;
  membershipType?: string;
  limit?:     number;
  offset?:    number;
}

@Injectable()
export class MembershipRepository {
  private readonly logger = new Logger(MembershipRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo()        { return this.dataSource.getRepository(MembershipEntity); }
  private get txRepo()      { return this.dataSource.getRepository(MembershipTransactionEntity); }
  private get auditRepo()   { return this.dataSource.getRepository(MembershipAuditLogEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<MembershipEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  async create(data: Partial<MembershipEntity>): Promise<MembershipEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<MembershipEntity | null> {
    return this.scopedQb('m', tenantId).andWhere('m.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<MembershipEntity> {
    const m = await this.findById(id, tenantId);
    if (!m) throw new NotFoundException(`Membership ${id} not found`);
    return m;
  }

  async findByMemberNumber(
    memberNumber: string,
    tenantId:     string,
  ): Promise<MembershipEntity | null> {
    return this.scopedQb('m', tenantId)
      .andWhere('m.memberNumber = :memberNumber', { memberNumber })
      .getOne();
  }

  /**
   * Finds the active (non-terminal) membership for a user in this tenant.
   * There should be at most one per user at any time — enforced at service layer.
   */
  async findActiveByUser(
    userId:   string,
    tenantId: string,
  ): Promise<MembershipEntity | null> {
    return this.scopedQb('m', tenantId)
      .andWhere('m.userId = :userId', { userId })
      .andWhere(`m.status NOT IN ('upgraded','downgraded','expired','cancelled')`)
      .orderBy('m.createdAt', 'DESC')
      .getOne();
  }

  async query(params: MembershipQueryParams): Promise<MembershipEntity[]> {
    const qb = this.scopedQb('m', params.tenantId)
      .orderBy('m.createdAt', 'DESC');

    if (params.userId)         qb.andWhere('m.userId = :userId',               { userId:         params.userId         });
    if (params.planId)         qb.andWhere('m.planId = :planId',               { planId:         params.planId         });
    if (params.status)         qb.andWhere('m.status = :status',               { status:         params.status         });
    if (params.membershipType) qb.andWhere('m.membershipType = :membershipType', { membershipType: params.membershipType });
    if (params.limit)          qb.take(params.limit);
    if (params.offset)         qb.skip(params.offset);

    return qb.getMany();
  }

  async updateById(
    id:       string,
    tenantId: string,
    data:     QueryDeepPartialEntity<MembershipEntity>,
  ): Promise<MembershipEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, deletedAt: new Date() },
    );
  }

  // ── Transactions (INSERT-only ledger) ─────────────────────────────────────

  async insertTransaction(
    data: Partial<MembershipTransactionEntity>,
  ): Promise<MembershipTransactionEntity> {
    return this.txRepo.save(this.txRepo.create(data));
  }

  async findTransactions(
    membershipId: string,
    tenantId:     string,
    limit = 50,
    offset = 0,
  ): Promise<MembershipTransactionEntity[]> {
    return this.txRepo
      .createQueryBuilder('t')
      .where('t.tenantId = :tenantId',         { tenantId })
      .andWhere('t.membershipId = :membershipId', { membershipId })
      .orderBy('t.createdAt', 'DESC')
      .take(limit)
      .skip(offset)
      .getMany();
  }

  // ── Audit log (INSERT-only) ───────────────────────────────────────────────

  async insertAuditLog(
    data: Partial<MembershipAuditLogEntity>,
  ): Promise<MembershipAuditLogEntity> {
    return this.auditRepo.save(this.auditRepo.create(data));
  }

  // ── Scheduler batch queries ───────────────────────────────────────────────

  /**
   * Memberships in trial/pending_payment whose trialEndsAt or expiresAt has passed.
   * Used by the trial-expiry and payment-expiry sweeps.
   */
  async findExpired(batchSize = 50): Promise<MembershipEntity[]> {
    return this.repo
      .createQueryBuilder('m')
      .where(`m.status IN ('trial', 'pending_payment', 'payment_failed')`)
      .andWhere('m.expiresAt < :now', { now: new Date() })
      .andWhere('m.isDeleted = false')
      .orderBy('m.expiresAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Trial memberships whose trialEndsAt has passed and have not been activated.
   */
  async findExpiredTrials(batchSize = 50): Promise<MembershipEntity[]> {
    return this.repo
      .createQueryBuilder('m')
      .where(`m.status = 'trial'`)
      .andWhere('m.trialEndsAt < :now', { now: new Date() })
      .andWhere('m.isDeleted = false')
      .orderBy('m.trialEndsAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Active memberships approaching renewal within the lead window.
   * Used by the renewal-invoice sweep.
   */
  async findDueForRenewal(leadDays: number, batchSize = 50): Promise<MembershipEntity[]> {
    const threshold = new Date(Date.now() + leadDays * 86_400_000);
    return this.repo
      .createQueryBuilder('m')
      .where(`m.status IN ('active', 'pending_renewal')`)
      .andWhere('m.renewsAt IS NOT NULL')
      .andWhere('m.renewsAt <= :threshold', { threshold })
      .andWhere('m.autoRenew = true')
      .andWhere('m.isDeleted = false')
      .orderBy('m.renewsAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * payment_failed memberships whose grace period has passed.
   */
  async findGraceExpired(batchSize = 50): Promise<MembershipEntity[]> {
    return this.repo
      .createQueryBuilder('m')
      .where(`m.status = 'payment_failed'`)
      .andWhere('m.expiresAt IS NOT NULL')
      .andWhere('m.expiresAt < :now', { now: new Date() })
      .andWhere('m.isDeleted = false')
      .orderBy('m.expiresAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Frozen memberships whose frozenUntil has passed.
   */
  async findFreezeExpired(batchSize = 50): Promise<MembershipEntity[]> {
    return this.repo
      .createQueryBuilder('m')
      .where(`m.status = 'frozen'`)
      .andWhere('m.frozenUntil < :now', { now: new Date() })
      .andWhere('m.isDeleted = false')
      .orderBy('m.frozenUntil', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Active memberships with a pending downgrade whose renewsAt has passed.
   * Scheduler executes the downgrade at renewal time.
   */
  async findPendingDowngrades(batchSize = 50): Promise<MembershipEntity[]> {
    return this.repo
      .createQueryBuilder('m')
      .where(`m.status = 'active'`)
      .andWhere('m.pendingDowngradePlanId IS NOT NULL')
      .andWhere('m.renewsAt IS NOT NULL')
      .andWhere('m.renewsAt <= :now', { now: new Date() })
      .andWhere('m.isDeleted = false')
      .orderBy('m.renewsAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * cancellation_pending memberships whose renewsAt has passed.
   */
  async findPendingCancellations(batchSize = 50): Promise<MembershipEntity[]> {
    return this.repo
      .createQueryBuilder('m')
      .where(`m.status = 'cancellation_pending'`)
      .andWhere('m.renewsAt IS NOT NULL')
      .andWhere('m.renewsAt <= :now', { now: new Date() })
      .andWhere('m.isDeleted = false')
      .orderBy('m.renewsAt', 'ASC')
      .take(batchSize)
      .getMany();
  }

  /**
   * Returns distinct tenantIds with non-terminal memberships.
   * Used by per-tenant scheduler sweeps (max 200 tenants per run).
   */
  async activeTenants(): Promise<string[]> {
    const rows = await this.repo.query<{ tenant_id: string }[]>(
      `SELECT DISTINCT tenant_id
       FROM memberships
       WHERE is_deleted = false
         AND status NOT IN ('upgraded','downgraded','expired','cancelled')
       LIMIT 200`,
    );
    return rows.map((r) => r.tenant_id);
  }
}
