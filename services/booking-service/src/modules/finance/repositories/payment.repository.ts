import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }                      from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder }   from 'typeorm';
import type { QueryDeepPartialEntity }           from 'typeorm/query-builder/QueryPartialEntity';
import {
  PaymentEntity,
  PaymentAllocationEntity,
  type PaymentStatus,
} from '../entities/payment.entity';

export interface CreatePaymentInput {
  tenantId:        string;
  reference:       string;
  method:          PaymentEntity['method'];
  gateway:         string;
  amountMinor:     number;
  currency:        string;
  customerId?:     string;
  idempotencyKey?: string;
  ipAddress?:      string;
  deviceId?:       string;
  createdById?:    string;
}

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get paymentRepo()    { return this.dataSource.getRepository(PaymentEntity); }
  private get allocationRepo() { return this.dataSource.getRepository(PaymentAllocationEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<PaymentEntity> {
    return this.paymentRepo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId });
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  async create(input: CreatePaymentInput): Promise<PaymentEntity> {
    return this.paymentRepo.save(
      this.paymentRepo.create({
        tenantId:          input.tenantId,
        reference:         input.reference,
        method:            input.method,
        gateway:           input.gateway,
        amountMinor:       input.amountMinor,
        currency:          input.currency,
        customerId:        input.customerId       ?? null,
        idempotencyKey:    input.idempotencyKey   ?? null,
        ipAddress:         input.ipAddress        ?? null,
        deviceId:          input.deviceId         ?? null,
        createdById:       input.createdById      ?? null,
        updatedById:       input.createdById      ?? null,
        status:            'initiated',
        capturedAmountMinor: 0,
        allocatedMinor:    0,
        unallocatedMinor:  0,
      }),
    );
  }

  async findById(id: string, tenantId: string): Promise<PaymentEntity | null> {
    return this.scopedQb('p', tenantId).andWhere('p.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<PaymentEntity> {
    const p = await this.findById(id, tenantId);
    if (!p) throw new NotFoundException(`Payment ${id} not found`);
    return p;
  }

  async findByIdempotencyKey(
    key:      string,
    tenantId: string,
  ): Promise<PaymentEntity | null> {
    return this.scopedQb('p', tenantId)
      .andWhere('p.idempotencyKey = :key', { key })
      .getOne();
  }

  async findByGatewayPaymentId(
    gatewayPaymentId: string,
    tenantId:         string,
  ): Promise<PaymentEntity | null> {
    return this.scopedQb('p', tenantId)
      .andWhere('p.gatewayPaymentId = :gatewayPaymentId', { gatewayPaymentId })
      .getOne();
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
    const qb = this.scopedQb('p', tenantId).orderBy('p.createdAt', 'DESC');
    if (opts.status)     qb.andWhere('p.status     = :status',     { status:     opts.status });
    if (opts.customerId) qb.andWhere('p.customerId = :customerId', { customerId: opts.customerId });
    if (opts.limit)      qb.take(opts.limit);
    if (opts.offset)     qb.skip(opts.offset);
    return qb.getMany();
  }

  async update(
    id:       string,
    tenantId: string,
    data:     QueryDeepPartialEntity<PaymentEntity>,
  ): Promise<void> {
    await this.paymentRepo.update({ id, tenantId }, data);
  }

  /**
   * Generates the next payment reference for a tenant-month.
   * Format: PAY-YYYYMM-NNNNN.
   */
  async nextReference(tenantId: string): Promise<string> {
    const now    = new Date();
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `PAY-${yyyymm}-`;
    const result = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM finance_payments
       WHERE tenant_id = $1 AND reference LIKE $2`,
      [tenantId, `${prefix}%`],
    );
    const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  // ── Allocations ───────────────────────────────────────────────────────────

  async createAllocation(params: {
    tenantId:       string;
    paymentId:      string;
    invoiceId:      string;
    allocatedMinor: number;
    currency:       string;
  }): Promise<PaymentAllocationEntity> {
    return this.allocationRepo.save(
      this.allocationRepo.create({
        tenantId:       params.tenantId,
        paymentId:      params.paymentId,
        invoiceId:      params.invoiceId,
        allocatedMinor: params.allocatedMinor,
        currency:       params.currency,
      }),
    );
  }

  async findAllocationsByPayment(
    paymentId: string,
    tenantId:  string,
  ): Promise<PaymentAllocationEntity[]> {
    return this.allocationRepo.find({
      where: { paymentId, tenantId },
      order: { allocatedAt: 'ASC' },
    });
  }

  async findAllocationsByInvoice(
    invoiceId: string,
    tenantId:  string,
  ): Promise<PaymentAllocationEntity[]> {
    return this.allocationRepo.find({
      where: { invoiceId, tenantId },
      order: { allocatedAt: 'ASC' },
    });
  }

  /** Sum of all allocations against an invoice — used to verify payment status. */
  async totalAllocatedForInvoice(invoiceId: string, tenantId: string): Promise<number> {
    const result = await this.allocationRepo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.allocatedMinor), 0)', 'total')
      .where('a.invoiceId = :invoiceId', { invoiceId })
      .andWhere('a.tenantId = :tenantId', { tenantId })
      .getRawOne<{ total: string }>();
    return parseInt(result?.total ?? '0', 10);
  }
}
