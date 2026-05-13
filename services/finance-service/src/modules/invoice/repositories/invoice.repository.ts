import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource }   from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import { InvoiceEntity, type InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceSequenceEntity } from '../entities/invoice-sequence.entity';

export interface InvoiceQueryParams {
  tenantId:       string;
  status?:        InvoiceStatus;
  type?:          string;
  branchId?:      string;
  userId?:        string;
  bookingId?:     string;
  from?:          Date;
  to?:            Date;
  invoiceNumber?: string;
  limit?:         number;
  offset?:        number;
}

@Injectable()
export class InvoiceRepository {
  private readonly logger = new Logger(InvoiceRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo()    { return this.dataSource.getRepository(InvoiceEntity);         }
  private get seqRepo() { return this.dataSource.getRepository(InvoiceSequenceEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<InvoiceEntity> {
    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(data: Partial<InvoiceEntity>): Promise<InvoiceEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string, tenantId: string): Promise<InvoiceEntity | null> {
    return this.scopedQb('i', tenantId).andWhere('i.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<InvoiceEntity> {
    const inv = await this.findById(id, tenantId);
    if (!inv) throw new Error(`Invoice ${id} not found`);
    return inv;
  }

  async findByNumber(invoiceNumber: string, tenantId: string): Promise<InvoiceEntity | null> {
    return this.scopedQb('i', tenantId)
      .andWhere('i.invoiceNumber = :invoiceNumber', { invoiceNumber })
      .getOne();
  }

  async findAllByTenant(tenantId: string): Promise<InvoiceEntity[]> {
    return this.scopedQb('i', tenantId)
      .orderBy('i.createdAt', 'DESC')
      .getMany();
  }

  async query(params: InvoiceQueryParams): Promise<InvoiceEntity[]> {
    const qb = this.scopedQb('i', params.tenantId)
      .orderBy('i.createdAt', 'DESC');

    if (params.status)        qb.andWhere('i.status = :status',               { status:        params.status        });
    if (params.type)          qb.andWhere('i.type = :type',                   { type:          params.type          });
    if (params.branchId)      qb.andWhere('i.branchId = :branchId',           { branchId:      params.branchId      });
    if (params.userId)        qb.andWhere('i.userId = :userId',               { userId:        params.userId        });
    if (params.bookingId)     qb.andWhere('i.bookingId = :bookingId',         { bookingId:     params.bookingId     });
    if (params.invoiceNumber) qb.andWhere('i.invoiceNumber ILIKE :num',       { num:           `%${params.invoiceNumber}%` });
    if (params.from)          qb.andWhere('i.createdAt >= :from',             { from:          params.from          });
    if (params.to)            qb.andWhere('i.createdAt < :to',               { to:            params.to            });

    if (params.limit)  qb.take(params.limit);
    if (params.offset) qb.skip(params.offset);

    return qb.getMany();
  }

  async update(id: string, tenantId: string, data: Partial<InvoiceEntity>): Promise<InvoiceEntity> {
    await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update(
      { id, tenantId },
      { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() },
    );
  }

  // ── Aggregates ─────────────────────────────────────────────────────────────

  async countByStatus(tenantId: string): Promise<Record<InvoiceStatus, number>> {
    const rows = await this.scopedQb('i', tenantId)
      .select('i.status', 'status')
      .addSelect('COUNT(i.id)::int', 'count')
      .groupBy('i.status')
      .getRawMany<{ status: InvoiceStatus; count: string }>();

    const counts: Record<InvoiceStatus, number> = {
      draft: 0, issued: 0, sent: 0, paid: 0,
      partially_paid: 0, overdue: 0, cancelled: 0, voided: 0,
    };
    for (const r of rows) counts[r.status] = Number(r.count);
    return counts;
  }

  async sumGrandTotal(tenantId: string, status?: InvoiceStatus): Promise<number> {
    const qb = this.scopedQb('i', tenantId)
      .select('COALESCE(SUM(i.grandTotalMinor), 0)::bigint', 'total');
    if (status) qb.andWhere('i.status = :status', { status });
    const r = await qb.getRawOne<{ total: string }>();
    return Number(r?.total ?? 0);
  }

  async findOverdueInvoices(tenantId: string): Promise<InvoiceEntity[]> {
    return this.scopedQb('i', tenantId)
      .andWhere("i.status IN ('issued', 'sent', 'partially_paid')")
      .andWhere('i.dueAt < :now', { now: new Date() })
      .getMany();
  }

  // ── Sequence (invoice numbering) ───────────────────────────────────────────

  /**
   * Atomically increments the sequence counter and returns the next value.
   * Uses a single UPDATE ... RETURNING for concurrency safety.
   * Creates the sequence row on first call (upsert pattern).
   */
  async nextSequence(params: {
    tenantId:       string;
    branchCode:     string;
    financialYear:  string;
    prefix?:        string;
  }): Promise<number> {
    const { tenantId, branchCode, financialYear, prefix = 'INV' } = params;

    // Upsert sequence row
    await this.seqRepo
      .createQueryBuilder()
      .insert()
      .into(InvoiceSequenceEntity)
      .values({
        tenantId,
        branchCode:     branchCode.toUpperCase(),
        financialYear,
        prefix:         prefix.toUpperCase(),
        currentSeq:     0,
      })
      .orIgnore() // ON CONFLICT DO NOTHING
      .execute();

    // Atomic increment and return
    const result = await this.seqRepo
      .createQueryBuilder()
      .update(InvoiceSequenceEntity)
      .set({ currentSeq: () => '"current_seq" + 1' })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('branchCode = :branchCode', { branchCode: branchCode.toUpperCase() })
      .andWhere('financialYear = :financialYear', { financialYear })
      .returning('"current_seq"')
      .execute();

    const raw = result.raw as Array<{ current_seq: number }>;
    return raw[0]?.current_seq ?? 1;
  }

  async findSequence(params: {
    tenantId:      string;
    branchCode:    string;
    financialYear: string;
  }): Promise<InvoiceSequenceEntity | null> {
    return this.seqRepo.findOne({
      where: {
        tenantId:      params.tenantId,
        branchCode:    params.branchCode.toUpperCase(),
        financialYear: params.financialYear,
      },
    });
  }
}
