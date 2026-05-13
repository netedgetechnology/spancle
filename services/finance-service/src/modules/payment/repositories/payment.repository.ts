import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import type { Repository }    from 'typeorm';
import { PaymentEntity }      from '../entities/payment.entity';
import type { PaymentQueryDto } from '../dto/create-payment.dto';

@Injectable()
export class PaymentRepository {
  private readonly logger = new Logger(PaymentRepository.name);

  constructor(
    @InjectRepository(PaymentEntity)
    private readonly repo: Repository<PaymentEntity>,
  ) {}

  async create(data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async findByIdempotencyKey(key: string, tenantId: string): Promise<PaymentEntity | null> {
    return this.repo.findOne({ where: { idempotencyKey: key, tenantId } });
  }

  async findByQuery(tenantId: string, query: Partial<PaymentQueryDto>): Promise<PaymentEntity[]> {
    const qb = this.repo.createQueryBuilder('p')
      .where('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_deleted = false')
      .orderBy('p.created_at', 'DESC');

    if (query.invoiceId) qb.andWhere('p.invoice_id = :invoiceId', { invoiceId: query.invoiceId });
    if (query.bookingId) qb.andWhere('p.booking_id = :bookingId', { bookingId: query.bookingId });
    if (query.branchId)  qb.andWhere('p.branch_id  = :branchId',  { branchId:  query.branchId  });
    if (query.method)    qb.andWhere('p.method     = :method',    { method:    query.method    });
    if (query.status)    qb.andWhere('p.status     = :status',    { status:    query.status    });
    if (query.from)      qb.andWhere('p.created_at >= :from',     { from:      query.from      });
    if (query.to)        qb.andWhere('p.created_at <= :to::date + interval \'1 day\'', { to: query.to });
    if (query.limit)     qb.limit(query.limit);
    if (query.offset)    qb.offset(query.offset);

    return qb.getMany();
  }

  async update(id: string, tenantId: string, data: Partial<PaymentEntity>): Promise<PaymentEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }

  async sumSettledForInvoice(invoiceId: string, tenantId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.net_amount_minor), 0)::bigint', 'total')
      .where('p.invoice_id = :invoiceId', { invoiceId })
      .andWhere('p.tenant_id = :tenantId', { tenantId })
      .andWhere('p.is_deleted = false')
      .andWhere("p.status IN ('captured', 'settled')")
      .getRawOne<{ total: string }>();
    return Number(result?.total ?? 0);
  }
}
