import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource }                    from '@nestjs/typeorm';
import { DataSource, type SelectQueryBuilder } from 'typeorm';
import type { QueryDeepPartialEntity }         from 'typeorm/query-builder/QueryPartialEntity';
import { InvoiceEntity, type InvoiceStatus }   from '../entities/invoice.entity';
import { InvoiceLineEntity }                   from '../entities/invoice-line.entity';
import { InvoiceTaxEntity }                    from '../entities/invoice-line.entity';
import { InvoiceReferenceEntity }              from '../entities/invoice-line.entity';

export interface CreateInvoiceInput {
  tenantId:      string;
  sourceType:    InvoiceEntity['sourceType'];
  sourceId?:     string;
  customerId?:   string;
  customerName:  string;
  customerEmail?: string;
  currency:      string;
  periodStart?:  Date;
  periodEnd?:    Date;
  couponCode?:   string;
  dueAt?:        Date;
  createdById?:  string;
}

export interface CreateLineInput {
  tenantId:       string;
  invoiceId:      string;
  description:    string;
  lineType:       string;
  quantity:       number;
  unitPriceMinor: number;
  subtotalMinor:  number;
  discountMinor:  number;
  netMinor:       number;
  taxMinor:       number;
  appliedRuleIds?: string[];
  couponCode?:    string;
  couponRuleId?:  string;
  discountSource?: string;
  lineSourceId?:  string;
  sortOrder?:     number;
}

export interface CreateTaxInput {
  tenantId:      string;
  invoiceId:     string;
  taxCode:       string;
  taxName:       string;
  regime:        string;
  rateBps:       number;
  taxableMinor:  number;
  taxMinor:      number;
  isInclusive:   boolean;
  isCompound:    boolean;
}

@Injectable()
export class InvoiceRepository {
  private readonly logger = new Logger(InvoiceRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get invoiceRepo()   { return this.dataSource.getRepository(InvoiceEntity); }
  private get lineRepo()      { return this.dataSource.getRepository(InvoiceLineEntity); }
  private get taxRepo()       { return this.dataSource.getRepository(InvoiceTaxEntity); }
  private get referenceRepo() { return this.dataSource.getRepository(InvoiceReferenceEntity); }

  private scopedQb(alias: string, tenantId: string): SelectQueryBuilder<InvoiceEntity> {
    return this.invoiceRepo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  // ── Invoice CRUD ──────────────────────────────────────────────────────────

  async create(input: CreateInvoiceInput): Promise<InvoiceEntity> {
    return this.invoiceRepo.save(
      this.invoiceRepo.create({
        tenantId:      input.tenantId,
        sourceType:    input.sourceType,
        sourceId:      input.sourceId       ?? null,
        customerId:    input.customerId     ?? null,
        customerName:  input.customerName,
        customerEmail: input.customerEmail  ?? null,
        currency:      input.currency,
        periodStart:   input.periodStart    ?? null,
        periodEnd:     input.periodEnd      ?? null,
        couponCode:    input.couponCode     ?? null,
        dueAt:         input.dueAt          ?? null,
        createdById:   input.createdById    ?? null,
        updatedById:   input.createdById    ?? null,
        status:        'draft',
        subtotalMinor: 0,
        discountMinor: 0,
        taxMinor:      0,
        totalMinor:    0,
        amountPaidMinor: 0,
        outstandingMinor: 0,
      }),
    );
  }

  async findById(id: string, tenantId: string): Promise<InvoiceEntity | null> {
    return this.scopedQb('inv', tenantId).andWhere('inv.id = :id', { id }).getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<InvoiceEntity> {
    const inv = await this.findById(id, tenantId);
    if (!inv) throw new NotFoundException(`Invoice ${id} not found`);
    return inv;
  }

  async findByNumber(
    invoiceNumber: string,
    tenantId:      string,
  ): Promise<InvoiceEntity | null> {
    return this.scopedQb('inv', tenantId)
      .andWhere('inv.invoiceNumber = :invoiceNumber', { invoiceNumber })
      .getOne();
  }

  async findBySource(
    sourceType: string,
    sourceId:   string,
    tenantId:   string,
  ): Promise<InvoiceEntity | null> {
    return this.scopedQb('inv', tenantId)
      .andWhere('inv.sourceType = :sourceType', { sourceType })
      .andWhere('inv.sourceId   = :sourceId',   { sourceId })
      .getOne();
  }

  async findAll(
    tenantId: string,
    opts: { status?: InvoiceStatus; customerId?: string; limit?: number; offset?: number } = {},
  ): Promise<InvoiceEntity[]> {
    const qb = this.scopedQb('inv', tenantId)
      .orderBy('inv.createdAt', 'DESC');
    if (opts.status)     qb.andWhere('inv.status     = :status',     { status:     opts.status     });
    if (opts.customerId) qb.andWhere('inv.customerId = :customerId', { customerId: opts.customerId });
    if (opts.limit)      qb.take(opts.limit);
    if (opts.offset)     qb.skip(opts.offset);
    return qb.getMany();
  }

  async update(
    id:       string,
    tenantId: string,
    data:     QueryDeepPartialEntity<InvoiceEntity>,
  ): Promise<void> {
    await this.invoiceRepo.update({ id, tenantId }, data);
  }

  // ── Invoice number sequence ───────────────────────────────────────────────

  /**
   * Generates the next invoice number for a tenant in a financial year.
   * Format: INV-YYYY-NNNNN (e.g. INV-2026-00042).
   * Uses a DB-level COUNT + 1 within the year — not a separate sequence table.
   * Wrapped in a transaction by the caller (finalise()) to prevent gaps.
   */
  async nextInvoiceNumber(tenantId: string, financialYear: number): Promise<string> {
    const prefix = `INV-${financialYear}-`;
    const result = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(*) AS count
       FROM finance_invoices
       WHERE tenant_id   = $1
         AND invoice_number LIKE $2
         AND is_deleted  = FALSE`,
      [tenantId, `${prefix}%`],
    );
    const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  // ── Lines ─────────────────────────────────────────────────────────────────

  async createLine(input: CreateLineInput): Promise<InvoiceLineEntity> {
    return this.lineRepo.save(this.lineRepo.create({
      tenantId:       input.tenantId,
      invoiceId:      input.invoiceId,
      description:    input.description,
      lineType:       input.lineType,
      quantity:       input.quantity,
      unitPriceMinor: input.unitPriceMinor,
      subtotalMinor:  input.subtotalMinor,
      discountMinor:  input.discountMinor,
      netMinor:       input.netMinor,
      taxMinor:       input.taxMinor,
      appliedRuleIds: input.appliedRuleIds  ?? null,
      couponCode:     input.couponCode      ?? null,
      couponRuleId:   input.couponRuleId    ?? null,
      discountSource: input.discountSource  ?? null,
      lineSourceId:   input.lineSourceId    ?? null,
      sortOrder:      input.sortOrder       ?? 0,
    }));
  }

  async findLines(invoiceId: string, tenantId: string): Promise<InvoiceLineEntity[]> {
    return this.lineRepo.find({
      where: { invoiceId, tenantId },
      order: { sortOrder: 'ASC' },
    });
  }

  // ── Taxes ─────────────────────────────────────────────────────────────────

  async createTax(input: CreateTaxInput): Promise<InvoiceTaxEntity> {
    return this.taxRepo.save(this.taxRepo.create(input));
  }

  async findTaxes(invoiceId: string, tenantId: string): Promise<InvoiceTaxEntity[]> {
    return this.taxRepo.find({ where: { invoiceId, tenantId } });
  }

  // ── References (M4 idempotency gate) ─────────────────────────────────────

  /**
   * Inserts a source → invoice reference.
   * Throws ConflictException if a reference for (tenantId, sourceType, sourceId)
   * already exists — this is the idempotency gate preventing duplicate invoices
   * on event re-delivery.
   */
  async createReference(params: {
    tenantId:      string;
    invoiceId:     string;
    invoiceNumber: string | null;
    sourceType:    string;
    sourceId:      string;
  }): Promise<InvoiceReferenceEntity> {
    const existing = await this.referenceRepo.findOne({
      where: {
        tenantId:   params.tenantId,
        sourceType: params.sourceType,
        sourceId:   params.sourceId,
      },
    });
    if (existing) {
      throw new ConflictException(
        `Invoice already exists for ${params.sourceType} ${params.sourceId}: ` +
        `${existing.invoiceNumber ?? existing.invoiceId}`,
      );
    }
    return this.referenceRepo.save(
      this.referenceRepo.create({
        tenantId:      params.tenantId,
        invoiceId:     params.invoiceId,
        invoiceNumber: params.invoiceNumber,
        sourceType:    params.sourceType,
        sourceId:      params.sourceId,
      }),
    );
  }

  async findReference(
    sourceType: string,
    sourceId:   string,
    tenantId:   string,
  ): Promise<InvoiceReferenceEntity | null> {
    return this.referenceRepo.findOne({
      where: { tenantId, sourceType, sourceId },
    });
  }

  /** Updates the denormalised invoiceNumber on the reference after finalisation. */
  async updateReferenceNumber(invoiceId: string, invoiceNumber: string): Promise<void> {
    await this.referenceRepo.update({ invoiceId }, { invoiceNumber });
  }
}
