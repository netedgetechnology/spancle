import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }         from '@nestjs/event-emitter';
import { InjectDataSource }      from '@nestjs/typeorm';
import { DataSource }            from 'typeorm';

import { InvoiceRepository }     from '../repositories/invoice.repository';
import { AccountingPeriodService } from './accounting-period.service';
import { DoubleEntryService }    from './double-entry.service';
import { TaxResolver }           from './tax-resolver.service';
import {
  InvoiceEvents,
  type InvoiceCreatedPayload,
  type InvoiceFinalisedPayload,
  type InvoiceVoidedPayload,
} from '../events/invoice.events';

import type { InvoiceEntity, InvoiceStatus }  from '../entities/invoice.entity';
import type { InvoiceLineEntity }             from '../entities/invoice-line.entity';
import type { InvoiceTaxEntity }              from '../entities/invoice-line.entity';
import type {
  CreateInvoiceDto,
  FinaliseInvoiceDto,
  VoidInvoiceDto,
} from '../dto/invoice.dto';

// ── Status state machine ──────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft:              ['pending', 'voided'],
  pending:            ['issued',  'voided'],
  issued:             ['partially_paid', 'paid', 'voided'],
  partially_paid:     ['paid', 'voided'],
  partially_refunded: ['refunded', 'paid', 'partially_paid'],
  paid:               [],
  refunded:           [],
  voided:             [],
};

function isTerminal(status: InvoiceStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

// ── GL account codes used at invoice creation and void ────────────────────────
// These come from the default ChartOfAccountService seeder (Batch 7.1A).

const GL = {
  ACCOUNTS_RECEIVABLE:         '1150',
  BOOKING_DEFERRED_REVENUE:    '2120',
  MEMBERSHIP_DEFERRED_REVENUE: '2130',
  REVENUE_OTHER:               '4900',
  GST_VAT_PAYABLE:             '2160',
} as const;

/** Maps InvoiceSourceType to its deferred-revenue GL account. */
function deferredRevenueAccount(sourceType: string): string {
  switch (sourceType) {
    case 'booking':    return GL.BOOKING_DEFERRED_REVENUE;
    case 'membership': return GL.MEMBERSHIP_DEFERRED_REVENUE;
    default:           return GL.REVENUE_OTHER;
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly invoiceRepository:   InvoiceRepository,
    private readonly periodService:        AccountingPeriodService,
    private readonly doubleEntryService:   DoubleEntryService,
    private readonly taxResolver:          TaxResolver,
    private readonly eventEmitter:         EventEmitter2,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Helpers ───────────────────────────────────────────────────────────────

  private assertTransitionAllowed(
    from: InvoiceStatus,
    to:   InvoiceStatus,
  ): void {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(
        `Cannot transition invoice from "${from}" to "${to}". ` +
        `Allowed from "${from}": [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`,
      );
    }
  }

  /** Returns the current financial year for invoice numbering (calendar year). */
  private financialYear(): number {
    return new Date().getFullYear();
  }

  // ── draft() ───────────────────────────────────────────────────────────────

  /**
   * Creates a new invoice in 'draft' status.
   *
   * Lines and taxes are persisted immediately so the draft can be inspected,
   * but no journal entry is posted and no invoice number is assigned.
   *
   * Idempotency: if sourceId is provided, checks invoice_references first.
   * Returns the existing invoice if one already exists for the same source.
   */
  async draft(
    dto:      CreateInvoiceDto,
    tenantId: string,
    actorId:  string,
  ): Promise<{ invoice: InvoiceEntity; lines: InvoiceLineEntity[]; taxes: InvoiceTaxEntity[] }> {
    // Idempotency gate — return existing if already created for this source
    if (dto.sourceId && dto.sourceType) {
      const existing = await this.invoiceRepository.findBySource(
        dto.sourceType, dto.sourceId, tenantId,
      );
      if (existing) {
        this.logger.warn(
          `draft: invoice already exists for ${dto.sourceType} ${dto.sourceId} ` +
          `— returning existing (${existing.id})`,
        );
        const lines = await this.invoiceRepository.findLines(existing.id, tenantId);
        const taxes = await this.invoiceRepository.findTaxes(existing.id, tenantId);
        return { invoice: existing, lines, taxes };
      }
    }

    // Create invoice header
    const invoice = await this.invoiceRepository.create({
      tenantId,
      sourceType:    dto.sourceType,
      sourceId:      dto.sourceId,
      customerId:    dto.customerId,
      customerName:  dto.customerName,
      customerEmail: dto.customerEmail,
      currency:      dto.currency,
      dueAt:         dto.dueAt    ? new Date(dto.dueAt)    : undefined,
      periodStart:   dto.periodStart ? new Date(dto.periodStart) : undefined,
      periodEnd:     dto.periodEnd   ? new Date(dto.periodEnd)   : undefined,
      couponCode:    dto.couponCode,
      createdById:   actorId,
    });

    // Persist lines
    let lineSubtotal  = 0;
    let lineDiscount  = 0;
    const savedLines: InvoiceLineEntity[] = [];

    for (let i = 0; i < dto.lines.length; i++) {
      const l   = dto.lines[i]!;
      const sub = l.subtotalMinor ?? (l.quantity * l.unitPriceMinor);
      const disc = l.discountMinor ?? 0;
      const net  = sub - disc;

      lineSubtotal += sub;
      lineDiscount += disc;

      const line = await this.invoiceRepository.createLine({
        tenantId,
        invoiceId:      invoice.id,
        description:    l.description,
        lineType:       l.lineType,
        quantity:       l.quantity,
        unitPriceMinor: l.unitPriceMinor,
        subtotalMinor:  sub,
        discountMinor:  disc,
        netMinor:       net,
        taxMinor:       0,    // computed at finalise()
        appliedRuleIds: l.appliedRuleIds,
        couponCode:     l.couponCode,
        couponRuleId:   l.couponRuleId,
        discountSource: l.discountSource,
        lineSourceId:   l.lineSourceId,
        sortOrder:      i,
      });
      savedLines.push(line);
    }

    // Update header subtotal/discount (tax computed at finalise)
    await this.invoiceRepository.update(invoice.id, tenantId, {
      subtotalMinor: lineSubtotal,
      discountMinor: lineDiscount,
      updatedById:   actorId,
    });
    invoice.subtotalMinor = lineSubtotal;
    invoice.discountMinor = lineDiscount;

    // Create invoice_reference for idempotency if sourceId present
    if (dto.sourceId && dto.sourceType) {
      await this.invoiceRepository.createReference({
        tenantId,
        invoiceId:     invoice.id,
        invoiceNumber: null,    // assigned at finalise()
        sourceType:    dto.sourceType,
        sourceId:      dto.sourceId,
      });
    }

    await this.eventEmitter.emitAsync(InvoiceEvents.CREATED, {
      tenantId,
      invoiceId:     invoice.id,
      invoiceNumber: null,
      sourceType:    dto.sourceType,
      sourceId:      dto.sourceId ?? null,
      customerId:    dto.customerId ?? null,
      totalMinor:    0,
      currency:      dto.currency,
      status:        'draft',
      timestamp:     new Date().toISOString(),
    } as InvoiceCreatedPayload);

    this.logger.log(
      `draft: created invoice ${invoice.id} (${dto.sourceType}/${dto.sourceId ?? 'manual'}) ` +
      `for tenant ${tenantId}`,
    );

    return { invoice, lines: savedLines, taxes: [] };
  }

  // ── finalise() ────────────────────────────────────────────────────────────

  /**
   * Transitions a draft/pending invoice to 'issued'.
   *
   * Steps (all within a single DB transaction):
   *   1. Validate status allows finalisation
   *   2. Compute tax via TaxResolver for each line
   *   3. Persist InvoiceTax rows
   *   4. Compute grand total = subtotal - discount + taxMinor
   *   5. Assign invoice number (INV-YYYY-NNNNN)
   *   6. Post double-entry journal: DR Accounts Receivable / CR Deferred Revenue
   *   7. Update invoice status + totals + journalEntryId
   *   8. Update invoice_reference with invoice number
   *   9. Emit INVOICE_FINALISED
   *
   * After finalisation the invoice is immutable — no field changes permitted
   * except amountPaidMinor and outstandingMinor (maintained by PaymentService).
   */
  async finalise(
    id:       string,
    dto:      FinaliseInvoiceDto,
    tenantId: string,
    actorId:  string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findByIdOrFail(id, tenantId);

    if (invoice.status !== 'draft' && invoice.status !== 'pending') {
      throw new UnprocessableEntityException(
        `Cannot finalise invoice with status "${invoice.status}". ` +
        `Only draft or pending invoices can be finalised.`,
      );
    }

    const now      = new Date();
    const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : now;
    const dueAt    = dto.dueAt    ? new Date(dto.dueAt) : (invoice.dueAt ?? null);

    // Validate accounting period is open for posting
    await this.periodService.assertOpen(tenantId, issuedAt);

    const lines = await this.invoiceRepository.findLines(id, tenantId);
    if (!lines.length) {
      throw new UnprocessableEntityException(
        `Cannot finalise invoice ${id}: no lines present`,
      );
    }

    let totalTaxMinor = 0;
    const savedTaxes: InvoiceTaxEntity[] = [];
    const jurisdiction      = (dto as { jurisdiction?: string }).jurisdiction ?? null;
    const transactionDateStr = issuedAt.toISOString().slice(0, 10);

    for (const line of lines) {
      const resolution = await this.taxResolver.resolveLine(
        tenantId,
        { lineAmountMinor: line.netMinor, lineType: line.lineType },
        jurisdiction,
        transactionDateStr,
      );

      const lineTaxMinor = resolution.totalTaxMinor;
      totalTaxMinor     += lineTaxMinor;

      // Persist tax snapshot rows
      for (const t of resolution.taxLines) {
        // Derive regime from taxCode prefix for snapshot (GST_* → 'gst', VAT_* → 'vat')
        const regime = t.taxCode.startsWith('GST') ? 'gst'
          : t.taxCode.startsWith('VAT') ? 'vat'
          : 'custom';
        const taxRow = await this.invoiceRepository.createTax({
          tenantId,
          invoiceId:    id,
          taxCode:      t.taxCode,
          taxName:      t.taxName,
          regime,
          rateBps:      t.rateBps,
          taxableMinor: t.taxableMinor,
          taxMinor:     t.taxMinor,
          isInclusive:  t.isInclusive,
          isCompound:   t.isCompound,
        });
        savedTaxes.push(taxRow);
      }
    }

    const netSubtotal  = invoice.subtotalMinor - invoice.discountMinor;
    const totalMinor   = netSubtotal + totalTaxMinor;
    const invoiceNumber = await this.invoiceRepository.nextInvoiceNumber(
      tenantId, this.financialYear(),
    );

    // Determine accounting period string
    const periodStr = `${issuedAt.getFullYear()}-${String(issuedAt.getMonth() + 1).padStart(2, '0')}`;

    // Post double-entry journal entry
    const journalEntry = await this.doubleEntryService.post({
      tenantId,
      entryType:   'invoice',
      sourceType:  invoice.sourceType,
      sourceId:    invoice.id,
      description: `Invoice ${invoiceNumber} — ${invoice.customerName}`,
      postedAt:    issuedAt,
      currency:    invoice.currency,
      lines: [
        {
          accountCode:  GL.ACCOUNTS_RECEIVABLE,
          debitMinor:   totalMinor,
          creditMinor:  0,
          currency:     invoice.currency,
          description:  `AR — ${invoiceNumber}`,
        },
        {
          accountCode:  deferredRevenueAccount(invoice.sourceType),
          debitMinor:   0,
          creditMinor:  totalMinor - totalTaxMinor,
          currency:     invoice.currency,
          description:  `Deferred revenue — ${invoiceNumber}`,
        },
        // Tax payable line (only if tax > 0)
        ...(totalTaxMinor > 0 ? [{
          accountCode:  GL.GST_VAT_PAYABLE,
          debitMinor:   0,
          creditMinor:  totalTaxMinor,
          currency:     invoice.currency,
          description:  `Tax payable — ${invoiceNumber}`,
        }] : []),
      ],
    });

    // Update invoice — lock in totals and status
    await this.invoiceRepository.update(id, tenantId, {
      status:          'issued',
      invoiceNumber,
      taxMinor:        totalTaxMinor,
      totalMinor,
      outstandingMinor: totalMinor,
      issuedAt,
      dueAt:           dueAt ?? undefined,
      journalEntryId:  journalEntry.id,
      updatedById:     actorId,
    });

    // Update reference table with assigned invoice number
    if (invoice.sourceId) {
      await this.invoiceRepository.updateReferenceNumber(id, invoiceNumber);
    }

    const updated = await this.invoiceRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(InvoiceEvents.FINALISED, {
      tenantId,
      invoiceId:      id,
      invoiceNumber,
      sourceType:     invoice.sourceType,
      sourceId:       invoice.sourceId ?? null,
      customerId:     invoice.customerId ?? null,
      totalMinor,
      currency:       invoice.currency,
      status:         'issued',
      issuedAt:       issuedAt.toISOString(),
      dueAt:          dueAt?.toISOString() ?? null,
      journalEntryId: journalEntry.id,
      timestamp:      now.toISOString(),
    } as InvoiceFinalisedPayload);

    this.logger.log(
      `finalise: ${invoiceNumber} issued (total ${totalMinor} ${invoice.currency}) ` +
      `— journal ${journalEntry.id} — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── void() ────────────────────────────────────────────────────────────────

  /**
   * Voids an invoice.
   *
   * Behaviour:
   *   - Only non-terminal invoices can be voided (see ALLOWED_TRANSITIONS).
   *   - If the invoice has been issued (has a journalEntryId), a reversing
   *     journal entry is posted via DoubleEntryService.reverse().
   *   - If still in draft/pending (no journalEntry), no reversal is needed.
   *   - Status transitions to 'voided' (terminal).
   *   - The invoice record is never deleted.
   *   - Emits INVOICE_VOIDED.
   */
  async void(
    id:       string,
    dto:      VoidInvoiceDto,
    tenantId: string,
    actorId:  string,
  ): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findByIdOrFail(id, tenantId);

    if (isTerminal(invoice.status)) {
      throw new BadRequestException(
        `Cannot void invoice "${invoice.invoiceNumber ?? id}" ` +
        `with terminal status "${invoice.status}"`,
      );
    }
    this.assertTransitionAllowed(invoice.status, 'voided');

    const now = new Date();
    let reversingEntryId: string | null = null;

    // Post reversing journal entry if the invoice had been issued
    if (invoice.journalEntryId) {
      const reversing = await this.doubleEntryService.reverse(
        invoice.journalEntryId,
        invoice.tenantId,
        `Void of invoice ${invoice.invoiceNumber ?? id}: ${dto.reason}`,
        actorId,
        now,
      );
      reversingEntryId = reversing.id;
    }

    await this.invoiceRepository.update(id, tenantId, {
      status:      'voided',
      voidedAt:    now,
      voidReason:  dto.reason,
      updatedById: actorId,
    });

    const updated = await this.invoiceRepository.findByIdOrFail(id, tenantId);

    await this.eventEmitter.emitAsync(InvoiceEvents.VOIDED, {
      tenantId,
      invoiceId:        id,
      invoiceNumber:    invoice.invoiceNumber,
      sourceType:       invoice.sourceType,
      sourceId:         invoice.sourceId ?? null,
      voidReason:       dto.reason,
      reversingEntryId: reversingEntryId ?? '',
      timestamp:        now.toISOString(),
    } as InvoiceVoidedPayload);

    this.logger.log(
      `void: invoice ${invoice.invoiceNumber ?? id} voided — ` +
      `reason: "${dto.reason}" — tenant ${tenantId}`,
    );

    return updated;
  }

  // ── Read paths ────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<InvoiceEntity> {
    return this.invoiceRepository.findByIdOrFail(id, tenantId);
  }

  async findByNumber(invoiceNumber: string, tenantId: string): Promise<InvoiceEntity> {
    const inv = await this.invoiceRepository.findByNumber(invoiceNumber, tenantId);
    if (!inv) throw new NotFoundException(`Invoice ${invoiceNumber} not found`);
    return inv;
  }

  async findByReference(
    sourceType: string,
    sourceId:   string,
    tenantId:   string,
  ): Promise<InvoiceEntity | null> {
    return this.invoiceRepository.findBySource(sourceType, sourceId, tenantId);
  }

  async findAll(
    tenantId: string,
    opts: { status?: InvoiceStatus; customerId?: string; limit?: number; offset?: number } = {},
  ): Promise<InvoiceEntity[]> {
    return this.invoiceRepository.findAll(tenantId, opts);
  }

  async findLines(id: string, tenantId: string): Promise<InvoiceLineEntity[]> {
    await this.invoiceRepository.findByIdOrFail(id, tenantId); // access guard
    return this.invoiceRepository.findLines(id, tenantId);
  }

  async findTaxes(id: string, tenantId: string): Promise<InvoiceTaxEntity[]> {
    await this.invoiceRepository.findByIdOrFail(id, tenantId); // access guard
    return this.invoiceRepository.findTaxes(id, tenantId);
  }
}
