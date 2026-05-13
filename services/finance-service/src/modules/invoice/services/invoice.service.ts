import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

import { InvoiceRepository }  from '../repositories/invoice.repository';
import { InvoiceUtils }       from '../utils/invoice.utils';
import { InvoiceEvents }      from '../events/invoice.events';
import type { InvoiceEntity, InvoiceStatus, InvoiceLineItem, GstType } from '../entities/invoice.entity';
import type { CreateInvoiceDto, CreateInvoiceLineItemDto } from '../dto/create-invoice.dto';
import type {
  UpdateInvoiceDto,
  InvoiceQueryDto,
  RecordPaymentDto,
  VoidInvoiceDto,
} from '../dto/update-invoice.dto';

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft:          ['issued', 'cancelled'],
  issued:         ['sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'voided'],
  sent:           ['paid', 'partially_paid', 'overdue', 'voided'],
  partially_paid: ['paid', 'overdue', 'voided'],
  overdue:        ['paid', 'partially_paid', 'voided'],
  paid:           ['voided'],             // voidable only (full reversal)
  cancelled:      [],
  voided:         [],
};

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly eventEmitter:      EventEmitter2,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto:      CreateInvoiceDto,
    tenantId: string,
    actorId:  string,
  ): Promise<InvoiceEntity> {
    // Validate line items
    if (!dto.lineItems.length) {
      throw new BadRequestException('Invoice must have at least one line item');
    }

    // Determine GST type from state codes or explicit override
    const gstType: GstType = dto.gstType ?? InvoiceUtils.determineGstType(
      dto.supplierStateCode,
      dto.recipientStateCode,
    );

    // Validate GSTIN formats if provided
    if (dto.customerGstin && !InvoiceUtils.isValidGstin(dto.customerGstin)) {
      throw new UnprocessableEntityException(
        `Invalid customer GSTIN format: ${dto.customerGstin}`,
      );
    }
    if (dto.supplierGstin && !InvoiceUtils.isValidGstin(dto.supplierGstin)) {
      throw new UnprocessableEntityException(
        `Invalid supplier GSTIN format: ${dto.supplierGstin}`,
      );
    }

    // Build line items with GST computed per line
    const lineItems = this.buildLineItems(dto.lineItems, gstType);

    // Invoice-level subtotal = sum of line taxable values before invoice discount
    const subtotalMinor        = lineItems.reduce((s, l) => s + l.subtotalMinor, 0);
    const invoiceDiscountMinor = dto.discountMinor ?? 0;

    // Compute invoice-level GST breakdown
    const gstBreakdown = InvoiceUtils.computeInvoiceGst({
      subtotalMinor,
      invoiceDiscountMinor,
      lineItems: lineItems.map((l) => ({
        taxableMinor: l.taxableMinor,
        gstRateBps:   l.gstRateBps,
      })),
      gstType,
    });

    // Generate invoice number
    const branchCode    = (dto.branchCode ?? 'HO').toUpperCase();
    const financialYear = InvoiceUtils.currentFinancialYear();
    const prefix        = dto.numberPrefix ?? (dto.type === 'credit_note' ? 'CRED' : 'INV');

    const seq = await this.invoiceRepository.nextSequence({
      tenantId, branchCode, financialYear, prefix,
    });

    const invoiceNumber = InvoiceUtils.formatInvoiceNumber(
      prefix, financialYear, branchCode, seq,
    );

    const invoice = await this.invoiceRepository.create({
      tenantId,
      invoiceNumber,
      status:             'draft',
      type:               dto.type ?? 'booking',
      bookingId:          dto.bookingId          ?? null,
      branchId:           dto.branchId,
      userId:             dto.userId             ?? null,
      originalInvoiceId:  dto.originalInvoiceId  ?? null,
      customerName:       dto.customerName,
      customerEmail:      dto.customerEmail,
      customerPhone:      dto.customerPhone      ?? null,
      customerGstin:      dto.customerGstin      ?? null,
      billingAddress:     dto.billingAddress     ?? null,
      supplierGstin:      dto.supplierGstin      ?? null,
      supplierStateCode:  dto.supplierStateCode  ?? null,
      recipientStateCode: dto.recipientStateCode ?? null,
      gstType,
      hsnSacCode:         dto.hsnSacCode         ?? null,
      lineItems,
      subtotalMinor,
      discountMinor:      invoiceDiscountMinor,
      taxableValueMinor:  gstBreakdown.taxableValueMinor,
      cgstRateBps:        gstBreakdown.cgstRateBps,
      cgstAmountMinor:    gstBreakdown.cgstAmountMinor,
      sgstRateBps:        gstBreakdown.sgstRateBps,
      sgstAmountMinor:    gstBreakdown.sgstAmountMinor,
      igstRateBps:        gstBreakdown.igstRateBps,
      igstAmountMinor:    gstBreakdown.igstAmountMinor,
      cessRateBps:        gstBreakdown.cessRateBps,
      cessAmountMinor:    gstBreakdown.cessAmountMinor,
      totalTaxMinor:      gstBreakdown.totalTaxMinor,
      grandTotalMinor:    gstBreakdown.grandTotalMinor,
      amountPaidMinor:    0,
      balanceDueMinor:    gstBreakdown.grandTotalMinor,
      currency:           dto.currency ?? 'INR',
      issuedAt:           dto.issuedAt ? new Date(dto.issuedAt) : null,
      dueAt:              dto.dueAt    ? new Date(dto.dueAt)    : null,
      notes:              dto.notes         ?? null,
      internalNotes:      dto.internalNotes ?? null,
      createdById:        actorId,
      updatedById:        actorId,
    });

    await this.eventEmitter.emitAsync(InvoiceEvents.CREATED, {
      tenantId, invoiceId: invoice.id, actorId,
      invoiceNumber, grandTotalMinor: invoice.grandTotalMinor,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Invoice created: ${invoiceNumber} tenant=${tenantId} total=${invoice.grandTotalMinor}`);

    // Auto-issue booking and membership invoices so they appear in revenue reports.
    // Manual and credit_note invoices require explicit issuance.
    if (invoice.type === 'booking' || invoice.type === 'membership' || invoice.type === 'academy') {
      try {
        const issued = await this.invoiceRepository.update(invoice.id, tenantId, {
          status:      'issued',
          issuedAt:    new Date(),
          updatedById: actorId,
        });
        await this.emitStatusChanged(tenantId, invoice.id, actorId, 'draft', 'issued');
        this.logger.log(`Invoice auto-issued: ${invoiceNumber}`);
        return issued;
      } catch (err) {
        this.logger.warn(`Auto-issue failed for ${invoiceNumber}: ${err} — invoice remains draft`);
      }
    }

    return invoice;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findAll(query: InvoiceQueryDto, tenantId: string): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.query({
      tenantId,
      status:        query.status as InvoiceStatus | undefined,
      type:          query.type,
      branchId:      query.branchId,
      userId:        query.userId,
      bookingId:     query.bookingId,
      from:          query.from ? new Date(query.from) : undefined,
      to:            query.to   ? new Date(query.to)   : undefined,
      invoiceNumber: query.invoiceNumber,
      limit:         query.limit  ?? 50,
      offset:        query.offset ?? 0,
    });
  }

  async findOne(id: string, tenantId: string): Promise<InvoiceEntity> {
    const inv = await this.invoiceRepository.findById(id, tenantId);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async findByNumber(invoiceNumber: string, tenantId: string): Promise<InvoiceEntity> {
    const inv = await this.invoiceRepository.findByNumber(invoiceNumber, tenantId);
    if (!inv) throw new NotFoundException('Invoice not found');
    return inv;
  }

  async getStatusSummary(tenantId: string) {
    const [counts, totalIssued, totalPaid] = await Promise.all([
      this.invoiceRepository.countByStatus(tenantId),
      this.invoiceRepository.sumGrandTotal(tenantId, 'issued'),
      this.invoiceRepository.sumGrandTotal(tenantId, 'paid'),
    ]);
    return { counts, totalIssued, totalPaid };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id:       string,
    dto:      UpdateInvoiceDto,
    tenantId: string,
    actorId:  string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status !== 'draft') {
      throw new BadRequestException('Only draft invoices can be edited');
    }

    const patch: Partial<InvoiceEntity> = {
      updatedById: actorId,
    };

    if (dto.customerName  !== undefined) patch.customerName  = dto.customerName;
    if (dto.customerEmail !== undefined) patch.customerEmail = dto.customerEmail;
    if (dto.customerPhone !== undefined) patch.customerPhone = dto.customerPhone ?? null;
    if (dto.customerGstin !== undefined) {
      if (dto.customerGstin && !InvoiceUtils.isValidGstin(dto.customerGstin)) {
        throw new UnprocessableEntityException(`Invalid GSTIN: ${dto.customerGstin}`);
      }
      patch.customerGstin = dto.customerGstin ?? null;
    }
    if (dto.billingAddress !== undefined) patch.billingAddress = dto.billingAddress ?? null;
    if (dto.dueAt          !== undefined) patch.dueAt          = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.notes          !== undefined) patch.notes          = dto.notes         ?? null;
    if (dto.internalNotes  !== undefined) patch.internalNotes  = dto.internalNotes ?? null;

    // Recalculate if line items changed
    if (dto.lineItems) {
      const lineItems        = this.buildLineItems(dto.lineItems, invoice.gstType);
      const subtotalMinor    = lineItems.reduce((s, l) => s + l.subtotalMinor, 0);
      const discountMinor    = dto.discountMinor ?? invoice.discountMinor;
      const gstBreakdown     = InvoiceUtils.computeInvoiceGst({
        subtotalMinor, invoiceDiscountMinor: discountMinor,
        lineItems: lineItems.map((l) => ({ taxableMinor: l.taxableMinor, gstRateBps: l.gstRateBps })),
        gstType: invoice.gstType,
      });
      Object.assign(patch, {
        lineItems, subtotalMinor, discountMinor,
        taxableValueMinor:  gstBreakdown.taxableValueMinor,
        cgstAmountMinor:    gstBreakdown.cgstAmountMinor,
        sgstAmountMinor:    gstBreakdown.sgstAmountMinor,
        igstAmountMinor:    gstBreakdown.igstAmountMinor,
        cessAmountMinor:    gstBreakdown.cessAmountMinor,
        totalTaxMinor:      gstBreakdown.totalTaxMinor,
        grandTotalMinor:    gstBreakdown.grandTotalMinor,
        balanceDueMinor:    gstBreakdown.grandTotalMinor - invoice.amountPaidMinor,
      });
    } else if (dto.discountMinor !== undefined) {
      patch.discountMinor = dto.discountMinor;
    }

    const updated = await this.invoiceRepository.update(id, tenantId, patch);

    await this.eventEmitter.emitAsync(InvoiceEvents.UPDATED, {
      tenantId, invoiceId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Issue ──────────────────────────────────────────────────────────────────

  async issue(id: string, tenantId: string, actorId: string): Promise<InvoiceEntity> {
    const invoice = await this.findOne(id, tenantId);
    this.assertTransition(invoice.status, 'issued');

    const updated = await this.invoiceRepository.update(id, tenantId, {
      status:      'issued',
      issuedAt:    invoice.issuedAt ?? new Date(),
      updatedById: actorId,
    });

    await this.emitStatusChanged(tenantId, id, actorId, invoice.status, 'issued');
    this.logger.log(`Invoice issued: ${invoice.invoiceNumber} tenant=${tenantId}`);
    return updated;
  }

  // ── Record payment ─────────────────────────────────────────────────────────

  async recordPayment(
    id:       string,
    dto:      RecordPaymentDto,
    tenantId: string,
    actorId:  string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.findOne(id, tenantId);

    if (!['issued', 'sent', 'partially_paid', 'overdue'].includes(invoice.status)) {
      throw new BadRequestException(`Cannot record payment on invoice with status: ${invoice.status}`);
    }

    if (dto.amountMinor > invoice.balanceDueMinor) {
      throw new BadRequestException(
        `Payment amount (${dto.amountMinor}) exceeds balance due (${invoice.balanceDueMinor})`,
      );
    }

    const newAmountPaid  = invoice.amountPaidMinor + dto.amountMinor;
    const newBalanceDue  = invoice.grandTotalMinor - newAmountPaid;
    const newStatus: InvoiceStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid';

    const updated = await this.invoiceRepository.update(id, tenantId, {
      amountPaidMinor: newAmountPaid,
      balanceDueMinor: Math.max(0, newBalanceDue),
      status:          newStatus,
      paidAt:          newStatus === 'paid' ? (dto.paidAt ? new Date(dto.paidAt) : new Date()) : invoice.paidAt,
      updatedById:     actorId,
    });

    await this.eventEmitter.emitAsync('spancle.invoice.payment_recorded', {
      tenantId, invoiceId: id, actorId,
      amountMinor: dto.amountMinor, newStatus,
      timestamp: new Date().toISOString(),
    });

    if (newStatus === 'paid') {
      await this.emitStatusChanged(tenantId, id, actorId, invoice.status, 'paid');
    }

    return updated;
  }

  // ── Void ──────────────────────────────────────────────────────────────────

  async void(
    id:       string,
    dto:      VoidInvoiceDto,
    tenantId: string,
    actorId:  string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.findOne(id, tenantId);
    this.assertTransition(invoice.status, 'voided');

    const updated = await this.invoiceRepository.update(id, tenantId, {
      status:       'voided',
      internalNotes: [invoice.internalNotes, `Voided: ${dto.reason}`].filter(Boolean).join('\n'),
      updatedById:  actorId,
    });

    await this.emitStatusChanged(tenantId, id, actorId, invoice.status, 'voided');
    this.logger.log(`Invoice voided: ${invoice.invoiceNumber} reason="${dto.reason}" tenant=${tenantId}`);
    return updated;
  }

  // ── Cancel ────────────────────────────────────────────────────────────────

  async cancel(id: string, tenantId: string, actorId: string): Promise<InvoiceEntity> {
    const invoice = await this.findOne(id, tenantId);
    this.assertTransition(invoice.status, 'cancelled');

    const updated = await this.invoiceRepository.update(id, tenantId, {
      status:      'cancelled',
      updatedById: actorId,
    });

    await this.emitStatusChanged(tenantId, id, actorId, invoice.status, 'cancelled');
    return updated;
  }

  // ── Overdue sweep (scheduler) ─────────────────────────────────────────────

  async markOverdue(tenantId: string): Promise<number> {
    const overdue = await this.invoiceRepository.findOverdueInvoices(tenantId);
    let count = 0;
    for (const inv of overdue) {
      try {
        await this.invoiceRepository.update(inv.id, tenantId, { status: 'overdue' });
        await this.emitStatusChanged(tenantId, inv.id, 'system', inv.status, 'overdue');
        count++;
      } catch { /* individual failure does not block others */ }
    }
    return count;
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    const invoice = await this.findOne(id, tenantId);

    if (invoice.status !== 'draft' && invoice.status !== 'cancelled') {
      throw new BadRequestException('Only draft or cancelled invoices can be deleted');
    }

    await this.invoiceRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(InvoiceEvents.DELETED, {
      tenantId, invoiceId: id, actorId, timestamp: new Date().toISOString(),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private buildLineItems(
    dtoItems: CreateInvoiceLineItemDto[],
    gstType:  GstType,
  ): InvoiceLineItem[] {
    return dtoItems.map((item) => {
      const subtotalMinor = Math.round(item.quantity * item.unitPriceMinor);
      const discountMinor = item.discountMinor ?? 0;
      const taxableMinor  = Math.max(0, subtotalMinor - discountMinor);
      const lineGst       = InvoiceUtils.computeLineGst(taxableMinor, item.gstRateBps, gstType);

      return {
        id:              InvoiceUtils.generateLineItemId(),
        description:     item.description,
        hsnSacCode:      item.hsnSacCode ?? null,
        quantity:        item.quantity,
        unitPriceMinor:  item.unitPriceMinor,
        subtotalMinor,
        discountMinor,
        taxableMinor,
        gstRateBps:      item.gstRateBps,
        cgstAmountMinor: lineGst.cgstAmountMinor,
        sgstAmountMinor: lineGst.sgstAmountMinor,
        igstAmountMinor: lineGst.igstAmountMinor,
        totalMinor:      lineGst.totalMinor,
      };
    });
  }

  private assertTransition(from: InvoiceStatus, to: InvoiceStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition invoice from "${from}" to "${to}". ` +
        `Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }
  }

  private async emitStatusChanged(
    tenantId: string,
    invoiceId: string,
    actorId: string,
    from: InvoiceStatus,
    to: InvoiceStatus,
  ): Promise<void> {
    await this.eventEmitter.emitAsync(InvoiceEvents.STATUS_CHANGED, {
      tenantId, invoiceId, actorId,
      previousStatus: from, newStatus: to,
      timestamp: new Date().toISOString(),
    });
  }
}
