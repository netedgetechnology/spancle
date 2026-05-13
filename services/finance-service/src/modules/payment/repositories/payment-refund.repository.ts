import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { PaymentRefundEntity, type RefundStatus } from '../entities/payment-refund.entity';

@Injectable()
export class PaymentRefundRepository {
  constructor(
    @InjectRepository(PaymentRefundEntity)
    private readonly repo: Repository<PaymentRefundEntity>,
  ) {}

  async create(data: Partial<PaymentRefundEntity>): Promise<PaymentRefundEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByPayment(paymentId: string, tenantId: string): Promise<PaymentRefundEntity[]> {
    return this.repo.find({
      where: { paymentId, tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findByInvoice(invoiceId: string, tenantId: string): Promise<PaymentRefundEntity[]> {
    return this.repo.find({
      where: { invoiceId, tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async sumProcessedForPayment(paymentId: string, tenantId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('r')
      .select("COALESCE(SUM(r.amount_minor), 0)::bigint", 'total')
      .where('r.payment_id = :paymentId', { paymentId })
      .andWhere('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.is_deleted = false')
      .andWhere("r.status NOT IN ('failed','rejected')")
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }

  async updateStatus(id: string, tenantId: string, status: RefundStatus, extra?: Partial<PaymentRefundEntity>): Promise<void> {
    await this.repo.update({ id, tenantId }, { status, ...extra, updatedAt: new Date() });
  }
}
