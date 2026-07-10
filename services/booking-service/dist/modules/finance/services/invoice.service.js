"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InvoiceService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const invoice_repository_1 = require("../repositories/invoice.repository");
const accounting_period_service_1 = require("./accounting-period.service");
const double_entry_service_1 = require("./double-entry.service");
const tax_resolver_service_1 = require("./tax-resolver.service");
const invoice_events_1 = require("../events/invoice.events");
const ALLOWED_TRANSITIONS = {
    draft: ['pending', 'voided'],
    pending: ['issued', 'voided'],
    issued: ['partially_paid', 'paid', 'voided'],
    partially_paid: ['paid', 'voided'],
    paid: [],
    voided: [],
};
function isTerminal(status) {
    return ALLOWED_TRANSITIONS[status].length === 0;
}
const GL = {
    ACCOUNTS_RECEIVABLE: '1150',
    BOOKING_DEFERRED_REVENUE: '2120',
    MEMBERSHIP_DEFERRED_REVENUE: '2130',
    REVENUE_OTHER: '4900',
    GST_VAT_PAYABLE: '2160',
};
function deferredRevenueAccount(sourceType) {
    switch (sourceType) {
        case 'booking': return GL.BOOKING_DEFERRED_REVENUE;
        case 'membership': return GL.MEMBERSHIP_DEFERRED_REVENUE;
        default: return GL.REVENUE_OTHER;
    }
}
let InvoiceService = InvoiceService_1 = class InvoiceService {
    constructor(invoiceRepository, periodService, doubleEntryService, taxResolver, eventEmitter, dataSource) {
        this.invoiceRepository = invoiceRepository;
        this.periodService = periodService;
        this.doubleEntryService = doubleEntryService;
        this.taxResolver = taxResolver;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(InvoiceService_1.name);
    }
    assertTransitionAllowed(from, to) {
        if (!ALLOWED_TRANSITIONS[from].includes(to)) {
            throw new common_1.BadRequestException(`Cannot transition invoice from "${from}" to "${to}". ` +
                `Allowed from "${from}": [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`);
        }
    }
    financialYear() {
        return new Date().getFullYear();
    }
    async draft(dto, tenantId, actorId) {
        if (dto.sourceId && dto.sourceType) {
            const existing = await this.invoiceRepository.findBySource(dto.sourceType, dto.sourceId, tenantId);
            if (existing) {
                this.logger.warn(`draft: invoice already exists for ${dto.sourceType} ${dto.sourceId} ` +
                    `— returning existing (${existing.id})`);
                const lines = await this.invoiceRepository.findLines(existing.id, tenantId);
                const taxes = await this.invoiceRepository.findTaxes(existing.id, tenantId);
                return { invoice: existing, lines, taxes };
            }
        }
        const invoice = await this.invoiceRepository.create({
            tenantId,
            sourceType: dto.sourceType,
            sourceId: dto.sourceId,
            customerId: dto.customerId,
            customerName: dto.customerName,
            customerEmail: dto.customerEmail,
            currency: dto.currency,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
            periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
            periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
            couponCode: dto.couponCode,
            createdById: actorId,
        });
        let lineSubtotal = 0;
        let lineDiscount = 0;
        const savedLines = [];
        for (let i = 0; i < dto.lines.length; i++) {
            const l = dto.lines[i];
            const sub = l.subtotalMinor ?? (l.quantity * l.unitPriceMinor);
            const disc = l.discountMinor ?? 0;
            const net = sub - disc;
            lineSubtotal += sub;
            lineDiscount += disc;
            const line = await this.invoiceRepository.createLine({
                tenantId,
                invoiceId: invoice.id,
                description: l.description,
                lineType: l.lineType,
                quantity: l.quantity,
                unitPriceMinor: l.unitPriceMinor,
                subtotalMinor: sub,
                discountMinor: disc,
                netMinor: net,
                taxMinor: 0,
                appliedRuleIds: l.appliedRuleIds,
                couponCode: l.couponCode,
                couponRuleId: l.couponRuleId,
                discountSource: l.discountSource,
                lineSourceId: l.lineSourceId,
                sortOrder: i,
            });
            savedLines.push(line);
        }
        await this.invoiceRepository.update(invoice.id, tenantId, {
            subtotalMinor: lineSubtotal,
            discountMinor: lineDiscount,
            updatedById: actorId,
        });
        invoice.subtotalMinor = lineSubtotal;
        invoice.discountMinor = lineDiscount;
        if (dto.sourceId && dto.sourceType) {
            await this.invoiceRepository.createReference({
                tenantId,
                invoiceId: invoice.id,
                invoiceNumber: null,
                sourceType: dto.sourceType,
                sourceId: dto.sourceId,
            });
        }
        await this.eventEmitter.emitAsync(invoice_events_1.InvoiceEvents.CREATED, {
            tenantId,
            invoiceId: invoice.id,
            invoiceNumber: null,
            sourceType: dto.sourceType,
            sourceId: dto.sourceId ?? null,
            customerId: dto.customerId ?? null,
            totalMinor: 0,
            currency: dto.currency,
            status: 'draft',
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`draft: created invoice ${invoice.id} (${dto.sourceType}/${dto.sourceId ?? 'manual'}) ` +
            `for tenant ${tenantId}`);
        return { invoice, lines: savedLines, taxes: [] };
    }
    async finalise(id, dto, tenantId, actorId) {
        const invoice = await this.invoiceRepository.findByIdOrFail(id, tenantId);
        if (invoice.status !== 'draft' && invoice.status !== 'pending') {
            throw new common_1.UnprocessableEntityException(`Cannot finalise invoice with status "${invoice.status}". ` +
                `Only draft or pending invoices can be finalised.`);
        }
        const now = new Date();
        const issuedAt = dto.issuedAt ? new Date(dto.issuedAt) : now;
        const dueAt = dto.dueAt ? new Date(dto.dueAt) : (invoice.dueAt ?? null);
        await this.periodService.assertOpen(tenantId, issuedAt);
        const lines = await this.invoiceRepository.findLines(id, tenantId);
        if (!lines.length) {
            throw new common_1.UnprocessableEntityException(`Cannot finalise invoice ${id}: no lines present`);
        }
        let totalTaxMinor = 0;
        const savedTaxes = [];
        const jurisdiction = dto.jurisdiction ?? null;
        const transactionDateStr = issuedAt.toISOString().slice(0, 10);
        for (const line of lines) {
            const resolution = await this.taxResolver.resolveLine(tenantId, { lineAmountMinor: line.netMinor, lineType: line.lineType }, jurisdiction, transactionDateStr);
            const lineTaxMinor = resolution.totalTaxMinor;
            totalTaxMinor += lineTaxMinor;
            for (const t of resolution.taxLines) {
                const regime = t.taxCode.startsWith('GST') ? 'gst'
                    : t.taxCode.startsWith('VAT') ? 'vat'
                        : 'custom';
                const taxRow = await this.invoiceRepository.createTax({
                    tenantId,
                    invoiceId: id,
                    taxCode: t.taxCode,
                    taxName: t.taxName,
                    regime,
                    rateBps: t.rateBps,
                    taxableMinor: t.taxableMinor,
                    taxMinor: t.taxMinor,
                    isInclusive: t.isInclusive,
                    isCompound: t.isCompound,
                });
                savedTaxes.push(taxRow);
            }
        }
        const netSubtotal = invoice.subtotalMinor - invoice.discountMinor;
        const totalMinor = netSubtotal + totalTaxMinor;
        const invoiceNumber = await this.invoiceRepository.nextInvoiceNumber(tenantId, this.financialYear());
        const periodStr = `${issuedAt.getFullYear()}-${String(issuedAt.getMonth() + 1).padStart(2, '0')}`;
        const journalEntry = await this.doubleEntryService.post({
            tenantId,
            entryType: 'invoice',
            sourceType: invoice.sourceType,
            sourceId: invoice.id,
            description: `Invoice ${invoiceNumber} — ${invoice.customerName}`,
            postedAt: issuedAt,
            currency: invoice.currency,
            lines: [
                {
                    accountCode: GL.ACCOUNTS_RECEIVABLE,
                    debitMinor: totalMinor,
                    creditMinor: 0,
                    currency: invoice.currency,
                    description: `AR — ${invoiceNumber}`,
                },
                {
                    accountCode: deferredRevenueAccount(invoice.sourceType),
                    debitMinor: 0,
                    creditMinor: totalMinor - totalTaxMinor,
                    currency: invoice.currency,
                    description: `Deferred revenue — ${invoiceNumber}`,
                },
                ...(totalTaxMinor > 0 ? [{
                        accountCode: GL.GST_VAT_PAYABLE,
                        debitMinor: 0,
                        creditMinor: totalTaxMinor,
                        currency: invoice.currency,
                        description: `Tax payable — ${invoiceNumber}`,
                    }] : []),
            ],
        });
        await this.invoiceRepository.update(id, tenantId, {
            status: 'issued',
            invoiceNumber,
            taxMinor: totalTaxMinor,
            totalMinor,
            outstandingMinor: totalMinor,
            issuedAt,
            dueAt: dueAt ?? undefined,
            journalEntryId: journalEntry.id,
            updatedById: actorId,
        });
        if (invoice.sourceId) {
            await this.invoiceRepository.updateReferenceNumber(id, invoiceNumber);
        }
        const updated = await this.invoiceRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(invoice_events_1.InvoiceEvents.FINALISED, {
            tenantId,
            invoiceId: id,
            invoiceNumber,
            sourceType: invoice.sourceType,
            sourceId: invoice.sourceId ?? null,
            customerId: invoice.customerId ?? null,
            totalMinor,
            currency: invoice.currency,
            status: 'issued',
            issuedAt: issuedAt.toISOString(),
            dueAt: dueAt?.toISOString() ?? null,
            journalEntryId: journalEntry.id,
            timestamp: now.toISOString(),
        });
        this.logger.log(`finalise: ${invoiceNumber} issued (total ${totalMinor} ${invoice.currency}) ` +
            `— journal ${journalEntry.id} — tenant ${tenantId}`);
        return updated;
    }
    async void(id, dto, tenantId, actorId) {
        const invoice = await this.invoiceRepository.findByIdOrFail(id, tenantId);
        if (isTerminal(invoice.status)) {
            throw new common_1.BadRequestException(`Cannot void invoice "${invoice.invoiceNumber ?? id}" ` +
                `with terminal status "${invoice.status}"`);
        }
        this.assertTransitionAllowed(invoice.status, 'voided');
        const now = new Date();
        let reversingEntryId = null;
        if (invoice.journalEntryId) {
            const reversing = await this.doubleEntryService.reverse(invoice.journalEntryId, invoice.tenantId, `Void of invoice ${invoice.invoiceNumber ?? id}: ${dto.reason}`, actorId, now);
            reversingEntryId = reversing.id;
        }
        await this.invoiceRepository.update(id, tenantId, {
            status: 'voided',
            voidedAt: now,
            voidReason: dto.reason,
            updatedById: actorId,
        });
        const updated = await this.invoiceRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(invoice_events_1.InvoiceEvents.VOIDED, {
            tenantId,
            invoiceId: id,
            invoiceNumber: invoice.invoiceNumber,
            sourceType: invoice.sourceType,
            sourceId: invoice.sourceId ?? null,
            voidReason: dto.reason,
            reversingEntryId: reversingEntryId ?? '',
            timestamp: now.toISOString(),
        });
        this.logger.log(`void: invoice ${invoice.invoiceNumber ?? id} voided — ` +
            `reason: "${dto.reason}" — tenant ${tenantId}`);
        return updated;
    }
    async findById(id, tenantId) {
        return this.invoiceRepository.findByIdOrFail(id, tenantId);
    }
    async findByNumber(invoiceNumber, tenantId) {
        const inv = await this.invoiceRepository.findByNumber(invoiceNumber, tenantId);
        if (!inv)
            throw new common_1.NotFoundException(`Invoice ${invoiceNumber} not found`);
        return inv;
    }
    async findByReference(sourceType, sourceId, tenantId) {
        return this.invoiceRepository.findBySource(sourceType, sourceId, tenantId);
    }
    async findAll(tenantId, opts = {}) {
        return this.invoiceRepository.findAll(tenantId, opts);
    }
    async findLines(id, tenantId) {
        await this.invoiceRepository.findByIdOrFail(id, tenantId);
        return this.invoiceRepository.findLines(id, tenantId);
    }
    async findTaxes(id, tenantId) {
        await this.invoiceRepository.findByIdOrFail(id, tenantId);
        return this.invoiceRepository.findTaxes(id, tenantId);
    }
};
exports.InvoiceService = InvoiceService;
exports.InvoiceService = InvoiceService = InvoiceService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [invoice_repository_1.InvoiceRepository,
        accounting_period_service_1.AccountingPeriodService,
        double_entry_service_1.DoubleEntryService,
        tax_resolver_service_1.TaxResolver,
        event_emitter_1.EventEmitter2,
        typeorm_2.DataSource])
], InvoiceService);
//# sourceMappingURL=invoice.service.js.map