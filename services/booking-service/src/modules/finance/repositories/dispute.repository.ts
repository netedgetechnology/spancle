import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                    from '@nestjs/typeorm';
import { DataSource, type EntityManager, type SelectQueryBuilder } from 'typeorm';
import type { QueryDeepPartialEntity }         from 'typeorm/query-builder/QueryPartialEntity';
import { DisputeEntity, type DisputeStatus }   from '../entities/dispute.entity';

export interface CreateDisputeInput {
  tenantId:            string;
  disputeNumber:       string;
  paymentId:           string;
  gateway:             string;
  gatewayDisputeId:    string;
  reason:              string;
  disputedAmountMinor: number;
  feeAmountMinor:      number;
  currency:            string;
  openedAt:            Date;
  evidenceDueAt?:      Date;
  metadata?:           Record<string, unknown>;
  createdById?:        string;
}

@Injectable()
export class DisputeRepository {
  private readonly logger = new Logger(DisputeRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() { return this.dataSource.getRepository(DisputeEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<DisputeEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId });
  }

  // ── Create ────────────────────────────────────────────────────────────────

  async create(
    input:   CreateDisputeInput,
    manager: EntityManager,
  ): Promise<DisputeEntity> {
    const dispute = manager.create(DisputeEntity, {
      tenantId:            input.tenantId,
      disputeNumber:       input.disputeNumber,
      paymentId:           input.paymentId,
      gateway:             input.gateway,
      gatewayDisputeId:    input.gatewayDisputeId,
      reason:              input.reason,
      status:              'opened',
      disputedAmountMinor: input.disputedAmountMinor,
      feeAmountMinor:      input.feeAmountMinor,
      currency:            input.currency,
      openedAt:            input.openedAt,
      evidenceDueAt:       input.evidenceDueAt ?? null,
      metadata:            input.metadata ?? null,
      createdById:         input.createdById ?? null,
      updatedById:         input.createdById ?? null,
    });
    try {
      return await manager.save(dispute);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('uq_finance_disputes_tenant_gateway_dispute')) {
        throw new ConflictException(
          `Dispute already exists for gateway=${input.gateway} disputeId=${input.gatewayDisputeId}`,
        );
      }
      throw err;
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<DisputeEntity | null> {
    return this.scopedQb('d', tenantId).andWhere('d.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<DisputeEntity> {
    const d = await this.findById(id, tenantId);
    if (!d) throw new NotFoundException(`Dispute ${id} not found`);
    return d;
  }

  async findByGatewayDisputeId(
    gateway:          string,
    gatewayDisputeId: string,
    tenantId:         string,
  ): Promise<DisputeEntity | null> {
    return this.scopedQb('d', tenantId)
      .andWhere('d.gateway          = :gateway',          { gateway })
      .andWhere('d.gatewayDisputeId = :gatewayDisputeId', { gatewayDisputeId })
      .getOne();
  }

  async findByPayment(paymentId: string, tenantId: string): Promise<DisputeEntity[]> {
    return this.scopedQb('d', tenantId)
      .andWhere('d.paymentId = :paymentId', { paymentId })
      .orderBy('d.openedAt', 'DESC')
      .getMany();
  }

  async findAll(
    tenantId: string,
    opts: { status?: DisputeStatus; limit?: number; offset?: number } = {},
  ): Promise<DisputeEntity[]> {
    const qb = this.scopedQb('d', tenantId).orderBy('d.openedAt', 'DESC');
    if (opts.status) qb.andWhere('d.status = :status', { status: opts.status });
    if (opts.limit)  qb.take(opts.limit);
    if (opts.offset) qb.skip(opts.offset);
    return qb.getMany();
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    id:       string,
    tenantId: string,
    data:     QueryDeepPartialEntity<DisputeEntity>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(DisputeEntity)
      : this.repo;
    await repo.update({ id, tenantId }, data);
  }

  // ── Reference sequence ────────────────────────────────────────────────────

  async nextDisputeNumber(tenantId: string): Promise<string> {
    const now    = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `DSP-${yyyymm}-`;
    const result = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count FROM finance_disputes
       WHERE tenant_id = $1 AND dispute_number LIKE $2`,
      [tenantId, `${prefix}%`],
    );
    const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  /**
   * Sum of disputedAmountMinor for all non-cancelled disputes against a payment.
   * Used at open-time to prevent cumulative over-disputing of a single payment.
   * Includes won/lost/opened/under_review — all statuses where funds were or
   * could be at stake. Only 'cancelled' disputes are excluded (funds never moved
   * or were fully reversed).
   */
  async totalActiveDisputedAmount(
    paymentId: string,
    tenantId:  string,
    manager:   EntityManager,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder(DisputeEntity, 'd')
      .select('COALESCE(SUM(d.disputedAmountMinor), 0)', 'total')
      .where('d.paymentId = :paymentId', { paymentId })
      .andWhere('d.tenantId  = :tenantId',  { tenantId })
      .andWhere("d.status   != 'cancelled'")
      .getRawOne<{ total: string }>();
    return parseInt(result?.total ?? '0', 10);
  }

  /**
   * Sum of disputedAmountMinor for disputes in 'lost' status only.
   *
   * Used to determine payment status at resolution:
   *   - If totalLostAmount > 0, funds are permanently forfeited;
   *     payment must remain 'chargedback' even after a partial win.
   *   - If totalLostAmount === 0 AND no open/under_review disputes remain,
   *     payment can be restored to 'captured'.
   */
  async totalLostDisputedAmount(
    paymentId: string,
    tenantId:  string,
    manager:   EntityManager,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder(DisputeEntity, 'd')
      .select('COALESCE(SUM(d.disputedAmountMinor), 0)', 'total')
      .where('d.paymentId = :paymentId', { paymentId })
      .andWhere('d.tenantId  = :tenantId',  { tenantId })
      .andWhere("d.status    = 'lost'")
      .getRawOne<{ total: string }>();
    return parseInt(result?.total ?? '0', 10);
  }

  /**
   * Count of disputes in 'opened' or 'under_review' status against a payment.
   * Used to determine whether a payment can be restored to 'captured':
   * restoration is only valid when no disputes are still in-flight AND no
   * disputes were lost.
   */
  async countOpenDisputesForPayment(
    paymentId: string,
    tenantId:  string,
    manager:   EntityManager,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder(DisputeEntity, 'd')
      .select('COUNT(*)', 'cnt')
      .where('d.paymentId = :paymentId', { paymentId })
      .andWhere('d.tenantId  = :tenantId',  { tenantId })
      .andWhere("d.status IN ('opened', 'under_review')")
      .getRawOne<{ cnt: string }>();
    return parseInt(result?.cnt ?? '0', 10);
  }
}
