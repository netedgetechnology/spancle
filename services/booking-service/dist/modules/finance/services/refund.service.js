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
var RefundService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const refund_repository_1 = require("../repositories/refund.repository");
const double_entry_service_1 = require("./double-entry.service");
const accounting_period_service_1 = require("./accounting-period.service");
const refund_events_1 = require("../events/refund.events");
const refund_entity_1 = require("../entities/refund.entity");
const invoice_entity_1 = require("../entities/invoice.entity");
const payment_entity_1 = require("../entities/payment.entity");
const payment_entity_2 = require("../entities/payment.entity");
const invoice_line_entity_1 = require("../entities/invoice-line.entity");
const payment_gateway_adapter_1 = require("../gateway/payment-gateway.adapter");
const GL = {
    BANK: '1120',
    CLEARING: '1130',
    CASH: '1110',
    REFUNDS_PAYABLE: '2180',
    BOOKING_DEFERRED: '2120',
    MEMBERSHIP_DEFERRED: '2130',
    TAX_PAYABLE: '2160',
};
function disbursementAccount(method) {
    switch (method) {
        case 'cash': return GL.CASH;
        case 'online_card':
        case 'card_present':
        case 'upi':
        case 'bank_transfer': return GL.CLEARING;
        default: return GL.BANK;
    }
}
function deferredRevenueAccount(sourceType) {
    switch (sourceType) {
        case 'membership': return GL.MEMBERSHIP_DEFERRED;
        default: return GL.BOOKING_DEFERRED;
    }
}
function largestRemainder(refundAmount, components, total) {
    if (refundAmount === 0)
        return components.map(() => 0);
    const exact = components.map((c) => (refundAmount * c.original) / total);
    const floored = exact.map((x) => Math.floor(x));
    const fracs = exact.map((x, i) => x - floored[i]);
    let remainder = refundAmount - floored.reduce((a, b) => a + b, 0);
    const order = fracs
        .map((f, i) => ({ i, f }))
        .sort((a, b) => b.f - a.f);
    const result = [...floored];
    for (const { i } of order) {
        if (remainder <= 0)
            break;
        result[i]++;
        remainder--;
    }
    const sum = result.reduce((a, b) => a + b, 0);
    if (sum !== refundAmount) {
        throw new Error(`Largest-remainder allocation BUG: sum=${sum} !== refundAmount=${refundAmount}`);
    }
    return result;
}
const ALLOWED_TRANSITIONS = {
    pending: ['processing', 'rejected'],
    processing: ['completed'],
    completed: [],
    rejected: [],
};
function assertRefundTransition(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new common_1.BadRequestException(`Cannot transition refund from "${from}" to "${to}". ` +
            `Allowed: [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`);
    }
}
let RefundService = RefundService_1 = class RefundService {
    constructor(refundRepository, doubleEntryService, periodService, eventEmitter, dataSource) {
        this.refundRepository = refundRepository;
        this.doubleEntryService = doubleEntryService;
        this.periodService = periodService;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(RefundService_1.name);
        this.adapters = new Map([
            ['stripe', new payment_gateway_adapter_1.StripeAdapter()],
            ['razorpay', new payment_gateway_adapter_1.RazorpayAdapter()],
        ]);
    }
    adapter(gateway) {
        return this.adapters.get(gateway) ?? null;
    }
    async prepareRefund(dto, tenantId, actorId) {
        if (!Number.isInteger(dto.amountMinor) || dto.amountMinor <= 0) {
            throw new common_1.BadRequestException('amountMinor must be a positive integer (minor units)');
        }
        await this.periodService.assertOpen(tenantId, new Date());
        if (dto.idempotencyKey) {
            const existing = await this.refundRepository.findByCallerIdempotencyKey(dto.idempotencyKey, tenantId);
            if (existing) {
                if (existing.paymentId !== dto.paymentId ||
                    existing.invoiceId !== dto.invoiceId ||
                    existing.amountMinor !== dto.amountMinor ||
                    existing.currency !== dto.currency) {
                    throw new common_1.ConflictException(`Caller idempotency key "${dto.idempotencyKey}" already used for a different ` +
                        `refund operation (paymentId/invoiceId/amount/currency mismatch). ` +
                        `This key cannot be reused with different parameters.`);
                }
                this.logger.debug(`prepareRefund: callerIdempotencyKey hit "${dto.idempotencyKey}" → returning ${existing.id}`);
                return existing;
            }
        }
        const refundNumber = await this.refundRepository.nextRefundNumber(tenantId);
        const refund = await this.dataSource.transaction(async (manager) => {
            const payment = await manager
                .createQueryBuilder(payment_entity_1.PaymentEntity, 'p')
                .setLock('pessimistic_write')
                .where('p.id = :id', { id: dto.paymentId })
                .andWhere('p.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!payment)
                throw new common_1.BadRequestException(`Payment ${dto.paymentId} not found`);
            if (payment.status !== 'captured' && payment.status !== 'chargedback') {
                throw new common_1.BadRequestException(`Cannot refund payment with status "${payment.status}"`);
            }
            const invoice = await manager
                .createQueryBuilder(invoice_entity_1.InvoiceEntity, 'inv')
                .setLock('pessimistic_write')
                .where('inv.id = :id', { id: dto.invoiceId })
                .andWhere('inv.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!invoice)
                throw new common_1.BadRequestException(`Invoice ${dto.invoiceId} not found`);
            if (['voided', 'refunded', 'draft', 'issued', 'pending'].includes(invoice.status)) {
                throw new common_1.BadRequestException(`Cannot refund invoice with status "${invoice.status}"`);
            }
            if (invoice.amountPaidMinor <= 0) {
                throw new common_1.BadRequestException('Invoice has no paid amount to refund');
            }
            if (dto.amountMinor > invoice.amountPaidMinor) {
                throw new common_1.BadRequestException(`Refund amount (${dto.amountMinor}) exceeds invoice amountPaidMinor (${invoice.amountPaidMinor})`);
            }
            const allocationExists = await manager.findOne(payment_entity_2.PaymentAllocationEntity, {
                where: { paymentId: dto.paymentId, invoiceId: dto.invoiceId, tenantId },
            });
            if (!allocationExists) {
                throw new common_1.BadRequestException(`Payment ${dto.paymentId} has not been allocated to invoice ${dto.invoiceId}`);
            }
            const alreadyActive = await this.refundRepository.totalActiveRefundedAmount(dto.invoiceId, tenantId, manager);
            if (alreadyActive + dto.amountMinor > invoice.amountPaidMinor) {
                throw new common_1.BadRequestException(`Total active refunds (${alreadyActive + dto.amountMinor}) would exceed ` +
                    `invoice amountPaidMinor (${invoice.amountPaidMinor})`);
            }
            const tmpKey = `tmp_${Date.now()}_${Math.random()}`;
            const created = await this.refundRepository.create({
                tenantId,
                refundNumber,
                paymentId: dto.paymentId,
                invoiceId: dto.invoiceId,
                amountMinor: dto.amountMinor,
                currency: dto.currency,
                method: payment.method,
                idempotencyKey: tmpKey,
                callerIdempotencyKey: dto.idempotencyKey || undefined,
                sourceType: dto.sourceType,
                sourceId: dto.sourceId,
                createdById: actorId,
            }, manager);
            const stableKey = `ref_${created.id}`;
            await manager.update(refund_entity_1.RefundEntity, { id: created.id, tenantId }, {
                idempotencyKey: stableKey,
                updatedById: actorId,
            });
            created.idempotencyKey = stableKey;
            return created;
        });
        await this.eventEmitter.emitAsync(refund_events_1.RefundEvents.PENDING, {
            tenantId,
            refundId: refund.id,
            refundNumber: refund.refundNumber,
            paymentId: refund.paymentId,
            invoiceId: refund.invoiceId,
            amountMinor: refund.amountMinor,
            currency: refund.currency,
            status: 'pending',
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`prepareRefund: ${refundNumber} pending (${refund.amountMinor} ${refund.currency}) ` +
            `— payment ${refund.paymentId} → invoice ${refund.invoiceId} — tenant ${tenantId}`);
        return refund;
    }
    async commitAccounting(refundId, gatewayRefundId, gatewayMeta, tenantId, actorId) {
        const now = new Date();
        await this.periodService.assertOpen(tenantId, now);
        await this.dataSource.transaction(async (manager) => {
            const refund = await manager
                .createQueryBuilder(refund_entity_1.RefundEntity, 'r')
                .setLock('pessimistic_write')
                .where('r.id = :id', { id: refundId })
                .andWhere('r.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!refund)
                throw new common_1.BadRequestException(`Refund ${refundId} not found`);
            if (refund.step1JournalEntryId) {
                this.logger.warn(`commitAccounting: refund ${refundId} already has step1JournalEntryId — idempotent return`);
                return;
            }
            assertRefundTransition(refund.status, 'processing');
            const payment = await manager
                .createQueryBuilder(payment_entity_1.PaymentEntity, 'p')
                .setLock('pessimistic_write')
                .where('p.id = :id', { id: refund.paymentId })
                .andWhere('p.tenantId = :tid', { tid: tenantId })
                .getOne();
            const invoice = await manager
                .createQueryBuilder(invoice_entity_1.InvoiceEntity, 'inv')
                .setLock('pessimistic_write')
                .where('inv.id = :id', { id: refund.invoiceId })
                .andWhere('inv.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!invoice)
                throw new common_1.BadRequestException(`Invoice ${refund.invoiceId} not found`);
            const alreadyCommitted = await this.refundRepository.totalActiveRefundedAmount(refund.invoiceId, tenantId, manager);
            if (alreadyCommitted - refund.amountMinor + refund.amountMinor > invoice.amountPaidMinor) {
                throw new common_1.BadRequestException(`Refund capacity exceeded under lock — concurrent over-refund prevented`);
            }
            const taxRows = await manager.find(invoice_line_entity_1.InvoiceTaxEntity, {
                where: { invoiceId: refund.invoiceId, tenantId },
            });
            const priorAllocations = await this.refundRepository.priorComponentAllocations(refund.invoiceId, tenantId, manager);
            const netOriginal = invoice.subtotalMinor - invoice.discountMinor;
            const components = [
                { label: 'net', taxId: null, original: netOriginal },
                ...taxRows.map((t) => ({ label: `tax_${t.id}`, taxId: t.id, original: t.taxMinor })),
            ];
            const newCumulative = invoice.amountRefundedMinor + refund.amountMinor;
            const targetAllocs = largestRemainder(newCumulative, components.map((c) => ({ label: c.label, original: c.original })), invoice.totalMinor);
            const priorMap = new Map();
            for (const prior of priorAllocations) {
                const key = prior.invoiceTaxId ?? 'net';
                priorMap.set(key, (priorMap.get(key) ?? 0) + prior.priorMinor);
            }
            const thisAlloc = components.map((c, i) => {
                const key = c.taxId ?? 'net';
                const prior = priorMap.get(key) ?? 0;
                const alloc = (targetAllocs[i] ?? 0) - prior;
                if (alloc < 0) {
                    throw new Error(`Negative component allocation for ${c.label}: target=${targetAllocs[i]}, prior=${prior}`);
                }
                return alloc;
            });
            const totalDebit = thisAlloc.reduce((a, b) => a + b, 0);
            if (totalDebit !== refund.amountMinor) {
                throw new Error(`Journal imbalance: sum(thisAlloc)=${totalDebit} !== refund.amountMinor=${refund.amountMinor}`);
            }
            const netAlloc = thisAlloc[0] ?? 0;
            const taxLines = thisAlloc.slice(1).map((amt, i) => ({
                accountCode: GL.TAX_PAYABLE,
                debitMinor: amt,
                creditMinor: 0,
                currency: refund.currency,
                description: `Tax refund component — ${refund.refundNumber}`,
            }));
            const journalLines = [
                {
                    accountCode: deferredRevenueAccount(invoice.sourceType),
                    debitMinor: netAlloc,
                    creditMinor: 0,
                    currency: refund.currency,
                    description: `Deferred revenue refund — ${refund.refundNumber}`,
                },
                ...taxLines,
                {
                    accountCode: GL.REFUNDS_PAYABLE,
                    debitMinor: 0,
                    creditMinor: refund.amountMinor,
                    currency: refund.currency,
                    description: `Refunds payable — ${refund.refundNumber}`,
                },
            ];
            const step1Entry = await this.doubleEntryService.postWithManager({
                tenantId,
                entryType: 'refund',
                sourceType: 'refund',
                sourceId: refundId,
                description: `Refund Step 1 — ${refund.refundNumber}`,
                postedAt: now,
                currency: refund.currency,
                lines: journalLines,
            }, manager);
            const allocationRows = components.map((c, i) => ({
                tenantId,
                refundId,
                invoiceId: refund.invoiceId,
                componentType: c.taxId ? 'tax' : 'net',
                invoiceTaxId: c.taxId,
                amountMinor: thisAlloc[i] ?? 0,
            }));
            await this.refundRepository.createAllocations(allocationRows, manager);
            const newAmountRefunded = invoice.amountRefundedMinor + refund.amountMinor;
            const terminal = newAmountRefunded >= invoice.amountPaidMinor
                && invoice.totalMinor - invoice.amountPaidMinor === 0;
            const newInvoiceStatus = terminal ? 'refunded' : 'partially_refunded';
            await manager.update(invoice_entity_1.InvoiceEntity, { id: refund.invoiceId, tenantId }, {
                amountRefundedMinor: newAmountRefunded,
                status: newInvoiceStatus,
                updatedById: actorId,
            });
            await manager.update(refund_entity_1.RefundEntity, { id: refundId, tenantId }, {
                status: 'processing',
                processingAt: now,
                step1JournalEntryId: step1Entry.id,
                gatewayRefundId: gatewayRefundId ?? null,
                gatewayMetadata: gatewayMeta ?? null,
                updatedById: actorId,
            });
        });
        const updated = await this.refundRepository.findByIdOrFail(refundId, tenantId);
        await this.eventEmitter.emitAsync(refund_events_1.RefundEvents.PROCESSING, {
            tenantId,
            refundId,
            refundNumber: updated.refundNumber,
            paymentId: updated.paymentId,
            invoiceId: updated.invoiceId,
            amountMinor: updated.amountMinor,
            currency: updated.currency,
            status: 'processing',
            step1JournalEntryId: updated.step1JournalEntryId,
            timestamp: now.toISOString(),
        });
        this.logger.log(`commitAccounting: refund ${updated.refundNumber} processing — ` +
            `journal ${updated.step1JournalEntryId} — tenant ${tenantId}`);
        return updated;
    }
    async completeRefund(refundId, dto, tenantId, actorId) {
        const now = new Date();
        await this.periodService.assertOpen(tenantId, now);
        await this.dataSource.transaction(async (manager) => {
            const refund = await manager
                .createQueryBuilder(refund_entity_1.RefundEntity, 'r')
                .setLock('pessimistic_write')
                .where('r.id = :id', { id: refundId })
                .andWhere('r.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!refund)
                throw new common_1.BadRequestException(`Refund ${refundId} not found`);
            if (refund.step2JournalEntryId) {
                this.logger.warn(`completeRefund: ${refundId} already completed — idempotent return`);
                return;
            }
            assertRefundTransition(refund.status, 'completed');
            const step2Entry = await this.doubleEntryService.postWithManager({
                tenantId,
                entryType: 'refund',
                sourceType: 'refund',
                sourceId: refundId,
                description: `Refund Step 2 — ${refund.refundNumber}`,
                postedAt: now,
                currency: refund.currency,
                lines: [
                    {
                        accountCode: GL.REFUNDS_PAYABLE,
                        debitMinor: refund.amountMinor,
                        creditMinor: 0,
                        currency: refund.currency,
                        description: `Refunds payable cleared — ${refund.refundNumber}`,
                    },
                    {
                        accountCode: disbursementAccount(refund.method),
                        debitMinor: 0,
                        creditMinor: refund.amountMinor,
                        currency: refund.currency,
                        description: `Cash disbursed — ${refund.refundNumber}`,
                    },
                ],
            }, manager);
            await manager.update(refund_entity_1.RefundEntity, { id: refundId, tenantId }, {
                status: 'completed',
                completedAt: now,
                step2JournalEntryId: step2Entry.id,
                gatewayRefundId: dto.gatewayRefundId ?? refund.gatewayRefundId,
                gatewayMetadata: dto.gatewayMetadata ?? refund.gatewayMetadata,
                updatedById: actorId,
            });
        });
        const updated = await this.refundRepository.findByIdOrFail(refundId, tenantId);
        await this.eventEmitter.emitAsync(refund_events_1.RefundEvents.COMPLETED, {
            tenantId,
            refundId,
            refundNumber: updated.refundNumber,
            paymentId: updated.paymentId,
            invoiceId: updated.invoiceId,
            amountMinor: updated.amountMinor,
            currency: updated.currency,
            status: 'completed',
            step1JournalEntryId: updated.step1JournalEntryId,
            step2JournalEntryId: updated.step2JournalEntryId,
            timestamp: now.toISOString(),
        });
        this.logger.log(`completeRefund: refund ${updated.refundNumber} completed — tenant ${tenantId}`);
        return updated;
    }
    async rejectRefund(refundId, dto, tenantId, actorId) {
        const now = new Date();
        await this.dataSource.transaction(async (manager) => {
            const refund = await manager
                .createQueryBuilder(refund_entity_1.RefundEntity, 'r')
                .setLock('pessimistic_write')
                .where('r.id = :id', { id: refundId })
                .andWhere('r.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!refund)
                throw new common_1.BadRequestException(`Refund ${refundId} not found`);
            assertRefundTransition(refund.status, 'rejected');
            await manager.update(refund_entity_1.RefundEntity, { id: refundId, tenantId }, {
                status: 'rejected',
                rejectedAt: now,
                rejectionReason: dto.reason,
                updatedById: actorId,
            });
        });
        const updated = await this.refundRepository.findByIdOrFail(refundId, tenantId);
        await this.eventEmitter.emitAsync(refund_events_1.RefundEvents.REJECTED, {
            tenantId,
            refundId,
            refundNumber: updated.refundNumber,
            paymentId: updated.paymentId,
            invoiceId: updated.invoiceId,
            amountMinor: updated.amountMinor,
            currency: updated.currency,
            status: 'rejected',
            rejectionReason: dto.reason,
            timestamp: now.toISOString(),
        });
        this.logger.warn(`rejectRefund: refund ${updated.refundNumber} rejected — ${dto.reason} — tenant ${tenantId}`);
        return updated;
    }
    async requestRefund(dto, tenantId, actorId) {
        const pending = await this.prepareRefund(dto, tenantId, actorId);
        let gatewayRefundId = null;
        let gatewayMeta = null;
        const payment = await this.dataSource.getRepository(payment_entity_1.PaymentEntity).findOne({
            where: { id: dto.paymentId, tenantId },
        });
        const adapter = payment ? this.adapter(payment.gateway) : null;
        if (adapter) {
            try {
                const result = await adapter.refund({
                    gatewayPaymentId: payment.gatewayPaymentId ?? '',
                    amountMinor: dto.amountMinor,
                    currency: dto.currency,
                    idempotencyKey: pending.idempotencyKey,
                });
                gatewayRefundId = result.gatewayRefundId;
                gatewayMeta = result.rawResponse;
            }
            catch (err) {
                this.logger.error(`requestRefund: gateway rejected for refund ${pending.id}: ${err.message}`);
                await this.rejectRefund(pending.id, { reason: err.message }, tenantId, actorId);
                throw new common_1.BadRequestException(`Gateway rejected refund: ${err.message}`);
            }
        }
        return this.commitAccounting(pending.id, gatewayRefundId, gatewayMeta, tenantId, actorId);
    }
    async findById(id, tenantId) {
        return this.refundRepository.findByIdOrFail(id, tenantId);
    }
    async findByInvoice(invoiceId, tenantId) {
        return this.refundRepository.findByInvoice(invoiceId, tenantId);
    }
    async findByPayment(paymentId, tenantId) {
        return this.refundRepository.findByPayment(paymentId, tenantId);
    }
    async findAll(tenantId, opts = {}) {
        return this.refundRepository.findAll(tenantId, opts);
    }
};
exports.RefundService = RefundService;
exports.RefundService = RefundService = RefundService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [refund_repository_1.RefundRepository,
        double_entry_service_1.DoubleEntryService,
        accounting_period_service_1.AccountingPeriodService,
        event_emitter_1.EventEmitter2,
        typeorm_2.DataSource])
], RefundService);
//# sourceMappingURL=refund.service.js.map