import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                    from '@nestjs/typeorm';
import { DataSource, type EntityManager, type SelectQueryBuilder } from 'typeorm';
import type { QueryDeepPartialEntity }         from 'typeorm/query-builder/QueryPartialEntity';
import {
  RefundEntity,
  RefundLineAllocationEntity,
  type RefundStatus,
} from '../entities/refund.entity';

export interface CreateRefundInput {
  tenantId:       string;
  refundNumber:   string;
  paymentId:      string;
  invoiceId:      string;
  amountMinor:    number;
  currency:       string;
  method:         string;
  idempotencyKey: string;
  sourceType?:    string;
  sourceId?:      string;
  createdById?:   string;
}

@Injectable()
export class RefundRepository {
  private readonly logger = new Logger(RefundRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get refundRepo()     { return this.dataSource.getRepository(RefundEntity); }
  private get allocationRepo() { return this.dataSource.getRepository(RefundLineAllocationEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<RefundEntity> {
    return this.refundRepo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId });
  }

  // ── Create (Phase A — inside caller's transaction) ─────────────────────────

  /**
   * Inserts a new refund in 'pending' status inside a caller-supplied transaction.
   * The UNIQUE (tenant_id, idempotency_key) constraint is the idempotency gate.
   */
  async create(input: CreateRefundInput, manager: EntityManager): Promise<RefundEntity> {
    const refund = manager.create(RefundEntity, {
      tenantId:       input.tenantId,
      refundNumber:   input.refundNumber,
      paymentId:      input.paymentId,
      invoiceId:      input.invoiceId,
      amountMinor:    input.amountMinor,
      currency:       input.currency,
      method:         input.method,
      idempotencyKey: input.idempotencyKey,
      status:         'pending',
      pendingAt:      new Date(),
      sourceType:     input.sourceType ?? null,
      sourceId:       input.sourceId   ?? null,
      createdById:    input.createdById ?? null,
      updatedById:    input.createdById ?? null,
    });
    try {
      return await manager.save(refund);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('uq_finance_refunds_idempotency')) {
        throw new ConflictException(
          `Refund already exists for idempotency key: ${input.idempotencyKey}`,
        );
      }
      throw err;
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<RefundEntity | null> {
    return this.scopedQb('r', tenantId).andWhere('r.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<RefundEntity> {
    const r = await this.findById(id, tenantId);
    if (!r) throw new NotFoundException(`Refund ${id} not found`);
    return r;
  }

  async findByIdempotencyKey(
    idempotencyKey: string,
    tenantId:       string,
  ): Promise<RefundEntity | null> {
    return this.scopedQb('r', tenantId)
      .andWhere('r.idempotencyKey = :idempotencyKey', { idempotencyKey })
      .getOne();
  }

  async findByInvoice(invoiceId: string, tenantId: string): Promise<RefundEntity[]> {
    return this.scopedQb('r', tenantId)
      .andWhere('r.invoiceId = :invoiceId', { invoiceId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  async findByPayment(paymentId: string, tenantId: string): Promise<RefundEntity[]> {
    return this.scopedQb('r', tenantId)
      .andWhere('r.paymentId = :paymentId', { paymentId })
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  async findAll(
    tenantId: string,
    opts: { status?: RefundStatus; limit?: number; offset?: number } = {},
  ): Promise<RefundEntity[]> {
    const qb = this.scopedQb('r', tenantId).orderBy('r.createdAt', 'DESC');
    if (opts.status) qb.andWhere('r.status = :status', { status: opts.status });
    if (opts.limit)  qb.take(opts.limit);
    if (opts.offset) qb.skip(opts.offset);
    return qb.getMany();
  }

  // ── Update ────────────────────────────────────────────────────────────────

  async update(
    id:       string,
    tenantId: string,
    data:     QueryDeepPartialEntity<RefundEntity>,
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager ? manager.getRepository(RefundEntity) : this.refundRepo;
    await repo.update({ id, tenantId }, data);
  }

  // ── Reference sequence ────────────────────────────────────────────────────

  async nextRefundNumber(tenantId: string): Promise<string> {
    const now    = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `REF-${yyyymm}-`;
    const result = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count FROM finance_refunds
       WHERE tenant_id = $1 AND refund_number LIKE $2`,
      [tenantId, `${prefix}%`],
    );
    const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  // ── Capacity query ────────────────────────────────────────────────────────

  /**
   * Sum of amountMinor for all active refunds against an invoice.
   * Active = pending + processing + completed.
   * Used in Phase A capacity check (under InvoiceEntity FOR UPDATE lock).
   */
  async totalActiveRefundedAmount(
    invoiceId: string,
    tenantId:  string,
    manager:   EntityManager,
  ): Promise<number> {
    const result = await manager
      .createQueryBuilder(RefundEntity, 'r')
      .select('COALESCE(SUM(r.amountMinor), 0)', 'total')
      .where('r.invoiceId = :invoiceId', { invoiceId })
      .andWhere('r.tenantId  = :tenantId',  { tenantId })
      .andWhere("r.status   IN ('pending', 'processing', 'completed')")
      .getRawOne<{ total: string }>();
    return parseInt(result?.total ?? '0', 10);
  }

  // ── Allocation rows ───────────────────────────────────────────────────────

  /**
   * Inserts allocation rows for all components of a refund.
   * Called atomically in Phase C inside the accounting commit transaction.
   */
  async createAllocations(
    rows: Array<{
      tenantId:      string;
      refundId:      string;
      invoiceId:     string;
      componentType: 'net' | 'tax';
      invoiceTaxId:  string | null;
      amountMinor:   number;
    }>,
    manager: EntityManager,
  ): Promise<void> {
    const entities = rows.map((r) =>
      manager.create(RefundLineAllocationEntity, r),
    );
    await manager.save(entities);
  }

  /**
   * Returns prior component allocations for the cumulative-delta algorithm.
   * Includes only committed (processing + completed) refunds — not pending
   * (pending has no allocation rows yet).
   * Called inside InvoiceEntity FOR UPDATE transaction.
   */
  async priorComponentAllocations(
    invoiceId: string,
    tenantId:  string,
    manager:   EntityManager,
  ): Promise<Array<{ componentType: string; invoiceTaxId: string | null; priorMinor: number }>> {
    const rows = await manager
      .createQueryBuilder(RefundLineAllocationEntity, 'rla')
      .innerJoin(
        RefundEntity,
        'r',
        'r.id = rla.refundId AND r.tenantId = rla.tenantId',
      )
      .select('rla.componentType',                               'componentType')
      .addSelect('rla.invoiceTaxId',                            'invoiceTaxId')
      .addSelect('COALESCE(SUM(rla.amountMinor), 0)::int',      'priorMinor')
      .where('rla.invoiceId = :invoiceId', { invoiceId })
      .andWhere('rla.tenantId  = :tenantId',  { tenantId })
      .andWhere("r.status IN ('processing', 'completed')")
      .groupBy('rla.componentType')
      .addGroupBy('rla.invoiceTaxId')
      .getRawMany<{ componentType: string; invoiceTaxId: string | null; priorMinor: string }>();

    return rows.map((r) => ({
      componentType: r.componentType,
      invoiceTaxId:  r.invoiceTaxId,
      priorMinor:    parseInt(r.priorMinor as unknown as string, 10),
    }));
  }
}
