"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_repository_1 = require("../repositories/payment.repository");
const invoice_repository_1 = require("../repositories/invoice.repository");
const journal_repository_1 = require("../repositories/journal.repository");
const double_entry_service_1 = require("./double-entry.service");
const accounting_period_service_1 = require("./accounting-period.service");
const payment_events_1 = require("../events/payment.events");
const payment_gateway_adapter_1 = require("../gateway/payment-gateway.adapter");
const payment_entity_1 = require("../entities/payment.entity");
const payment_entity_2 = require("../entities/payment.entity");
const GL = {
    ACCOUNTS_RECEIVABLE: '1150',
    BANK: '1120',
    CLEARING: '1130',
    CASH: '1110',
};
function receiptAccount(method) {
    switch (method) {
        case 'cash': return GL.CASH;
        case 'online_card':
        case 'card_present':
        case 'upi':
        case 'bank_transfer': return GL.CLEARING;
        default: return GL.BANK;
    }
}
const ALLOWED_TRANSITIONS = {
    initiated: ['authorized', 'captured', 'failed', 'cancelled'],
    authorized: ['captured', 'failed', 'cancelled'],
    captured: ['chargedback'],
    failed: [],
    cancelled: [],
    chargedback: [],
};
function assertTransitionAllowed(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new common_1.BadRequestException(`Cannot transition payment from "${from}" to "${to}". ` +
            `Allowed: [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`);
    }
}
let PaymentService = PaymentService_1 = class PaymentService {
    constructor(paymentRepository, invoiceRepository, journalRepository, doubleEntryService, periodService, eventEmitter, dataSource) {
        this.paymentRepository = paymentRepository;
        this.invoiceRepository = invoiceRepository;
        this.journalRepository = journalRepository;
        this.doubleEntryService = doubleEntryService;
        this.periodService = periodService;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(PaymentService_1.name);
        this.adapters = new Map([
            ['stripe', new payment_gateway_adapter_1.StripeAdapter()],
            ['razorpay', new payment_gateway_adapter_1.RazorpayAdapter()],
        ]);
    }
    adapter(gateway) {
        return this.adapters.get(gateway) ?? null;
    }
    buildEventBase(p, timestamp) {
        return {
            tenantId: p.tenantId,
            paymentId: p.id,
            reference: p.reference,
            amountMinor: p.amountMinor,
            currency: p.currency,
            method: p.method,
            gateway: p.gateway,
            status: p.status,
            customerId: p.customerId ?? null,
            timestamp,
        };
    }
    async initiate(dto, tenantId, actorId) {
        const existing = await this.paymentRepository.findByIdempotencyKey(dto.idempotencyKey, tenantId);
        if (existing) {
            this.logger.warn(`initiate: idempotency hit for key ${dto.idempotencyKey} → returning ${existing.id}`);
            return existing;
        }
        const reference = await this.paymentRepository.nextReference(tenantId);
        const payment = await this.paymentRepository.create({
            tenantId,
            reference,
            method: dto.method,
            gateway: dto.gateway,
            amountMinor: dto.amountMinor,
            currency: dto.currency,
            customerId: dto.customerId,
            idempotencyKey: dto.idempotencyKey,
            ipAddress: dto.ipAddress,
            deviceId: dto.deviceId,
            createdById: actorId,
        });
        const adapter = this.adapter(dto.gateway);
        if (adapter) {
            try {
                const result = await adapter.initiate({
                    tenantId,
                    amountMinor: dto.amountMinor,
                    currency: dto.currency,
                    customerId: dto.customerId,
                    idempotencyKey: dto.idempotencyKey,
                });
                await this.paymentRepository.update(payment.id, tenantId, {
                    gatewayPaymentId: result.gatewayPaymentId,
                    gatewayStatus: result.gatewayStatus,
                    gatewayMetadata: result.rawResponse,
                    updatedById: actorId,
                });
                payment.gatewayPaymentId = result.gatewayPaymentId;
                payment.gatewayStatus = result.gatewayStatus;
            }
            catch (err) {
                this.logger.error(`initiate: gateway error — ${err.message}`);
                await this.fail(payment.id, { reason: err.message }, tenantId, actorId);
                throw new common_1.UnprocessableEntityException(`Gateway initiation failed: ${err.message}`);
            }
        }
        await this.eventEmitter.emitAsync(payment_events_1.PaymentEvents.INITIATED, {
            ...this.buildEventBase(payment, new Date().toISOString()),
        });
        this.logger.log(`initiate: payment ${reference} created — tenant ${tenantId}`);
        return this.paymentRepository.findByIdOrFail(payment.id, tenantId);
    }
    async authorize(id, gatewayPaymentId, tenantId, actorId) {
        const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
        assertTransitionAllowed(payment.status, 'authorized');
        const now = new Date();
        await this.paymentRepository.update(id, tenantId, {
            status: 'authorized',
            gatewayPaymentId,
            authorizedAt: now,
            updatedById: actorId,
        });
        await this.eventEmitter.emitAsync(payment_events_1.PaymentEvents.AUTHORIZED, {
            ...this.buildEventBase({ ...payment, status: 'authorized' }, now.toISOString()),
        });
        return this.paymentRepository.findByIdOrFail(id, tenantId);
    }
    async capture(id, dto, tenantId, actorId) {
        const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
        assertTransitionAllowed(payment.status, 'captured');
        if (payment.journalEntryId) {
            this.logger.warn(`capture: payment ${payment.id} already has journalEntryId ${payment.journalEntryId} ` +
                `— returning without re-posting`);
            return this.paymentRepository.findByIdOrFail(id, tenantId);
        }
        const captureMinor = dto.amountMinor ?? payment.amountMinor;
        if (!Number.isInteger(captureMinor) || captureMinor <= 0) {
            throw new common_1.BadRequestException('Capture amount must be a positive integer (minor units)');
        }
        const now = new Date();
        const period = await this.periodService.assertOpen(tenantId, now);
        const periodStr = period.period;
        const adapter = this.adapter(payment.gateway);
        let gatewayStatus = 'captured';
        let gatewayMeta = {};
        if (adapter) {
            const result = await adapter.capture({
                gatewayPaymentId: payment.gatewayPaymentId ?? '',
                amountMinor: captureMinor,
                currency: payment.currency,
                idempotencyKey: `cap_${payment.idempotencyKey ?? payment.id}`,
            });
            gatewayStatus = result.gatewayStatus;
            gatewayMeta = result.rawResponse;
        }
        const journalLines = [
            {
                accountCode: receiptAccount(payment.method),
                debitMinor: captureMinor,
                creditMinor: 0,
                currency: payment.currency,
                description: `${payment.method} receipt — ${payment.reference}`,
            },
            {
                accountCode: GL.ACCOUNTS_RECEIVABLE,
                debitMinor: 0,
                creditMinor: captureMinor,
                currency: payment.currency,
                description: `AR cleared — ${payment.reference}`,
            },
        ];
        this.doubleEntryService.assertBalanced(journalLines);
        const journalEntryId = await this.dataSource.transaction(async (manager) => {
            const reference = await this.journalRepository.nextReference(periodStr, tenantId);
            const entryInput = {
                tenantId,
                reference,
                entryType: 'payment',
                sourceType: 'payment',
                sourceId: payment.id,
                description: `Payment received — ${payment.reference ?? payment.id}`,
                postedAt: now,
                accountingPeriod: periodStr,
                lines: journalLines,
            };
            const entry = await this.journalRepository.insertEntry(entryInput, manager);
            await manager.update(payment_entity_1.PaymentEntity, { id, tenantId }, {
                status: 'captured',
                capturedAmountMinor: captureMinor,
                unallocatedMinor: captureMinor,
                gatewayStatus,
                gatewayMetadata: gatewayMeta,
                capturedAt: now,
                journalEntryId: entry.id,
                updatedById: actorId,
            });
            return entry.id;
        });
        const updated = await this.paymentRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(payment_events_1.PaymentEvents.CAPTURED, {
            ...this.buildEventBase(updated, now.toISOString()),
            capturedAmountMinor: captureMinor,
            gatewayPaymentId: payment.gatewayPaymentId,
            journalEntryId,
        });
        this.logger.log(`capture: payment ${payment.reference} captured (${captureMinor} ${payment.currency}) ` +
            `— journal ${journalEntryId} — tenant ${tenantId}`);
        return updated;
    }
    async fail(id, dto, tenantId, actorId) {
        const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
        assertTransitionAllowed(payment.status, 'failed');
        const now = new Date();
        await this.paymentRepository.update(id, tenantId, {
            status: 'failed',
            failureReason: dto.reason ?? null,
            failedAt: now,
            updatedById: actorId,
        });
        const updated = await this.paymentRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(payment_events_1.PaymentEvents.FAILED, {
            ...this.buildEventBase(updated, now.toISOString()),
            failureReason: dto.reason ?? null,
        });
        this.logger.warn(`fail: payment ${payment.reference ?? id} failed — tenant ${tenantId}`);
        return updated;
    }
    async allocate(paymentId, dto, tenantId, actorId) {
        const payment = await this.paymentRepository.findByIdOrFail(paymentId, tenantId);
        if (payment.status !== 'captured') {
            throw new common_1.BadRequestException(`Can only allocate captured payments. Payment status is "${payment.status}"`);
        }
        if (!Number.isInteger(dto.allocatedMinor) || dto.allocatedMinor <= 0) {
            throw new common_1.BadRequestException('allocatedMinor must be a positive integer');
        }
        if (dto.allocatedMinor > payment.unallocatedMinor) {
            throw new common_1.BadRequestException(`Cannot allocate ${dto.allocatedMinor}: only ${payment.unallocatedMinor} unallocated on payment`);
        }
        const invoice = await this.invoiceRepository.findByIdOrFail(dto.invoiceId, tenantId);
        if (invoice.status === 'voided' || invoice.status === 'paid') {
            throw new common_1.BadRequestException(`Cannot allocate to invoice with status "${invoice.status}"`);
        }
        if (dto.allocatedMinor > invoice.outstandingMinor) {
            throw new common_1.BadRequestException(`Cannot allocate ${dto.allocatedMinor} to invoice ${invoice.invoiceNumber ?? dto.invoiceId}: ` +
                `only ${invoice.outstandingMinor} outstanding`);
        }
        const { newAmountPaid, newOutstanding, newInvoiceStatus } = await this.dataSource.transaction(async (manager) => {
            const currentTotal = await manager
                .createQueryBuilder(payment_entity_2.PaymentAllocationEntity, 'a')
                .select('COALESCE(SUM(a.allocatedMinor), 0)', 'total')
                .where('a.invoiceId = :invoiceId', { invoiceId: dto.invoiceId })
                .andWhere('a.tenantId = :tenantId', { tenantId })
                .getRawOne();
            const totalAllocated = parseInt(currentTotal?.total ?? '0', 10);
            const newAmountPaid = totalAllocated + dto.allocatedMinor;
            const newOutstanding = Math.max(0, invoice.totalMinor - newAmountPaid);
            const newInvoiceStatus = newOutstanding === 0 ? 'paid' : 'partially_paid';
            await manager.save(manager.create(payment_entity_2.PaymentAllocationEntity, {
                tenantId,
                paymentId,
                invoiceId: dto.invoiceId,
                allocatedMinor: dto.allocatedMinor,
                currency: payment.currency,
            }));
            await manager.update((await Promise.resolve().then(() => __importStar(require('../entities/invoice.entity')))).InvoiceEntity, { id: dto.invoiceId, tenantId }, {
                amountPaidMinor: newAmountPaid,
                outstandingMinor: newOutstanding,
                status: newInvoiceStatus,
                paidAt: newInvoiceStatus === 'paid' ? new Date() : null,
                updatedById: actorId,
            });
            const newAllocated = payment.allocatedMinor + dto.allocatedMinor;
            const newUnallocated = payment.capturedAmountMinor - newAllocated;
            await manager.update(payment_entity_1.PaymentEntity, { id: paymentId, tenantId }, {
                allocatedMinor: newAllocated,
                unallocatedMinor: newUnallocated,
                updatedById: actorId,
            });
            return { newAmountPaid, newOutstanding, newInvoiceStatus };
        });
        const updated = await this.paymentRepository.findByIdOrFail(paymentId, tenantId);
        await this.eventEmitter.emitAsync(payment_events_1.PaymentEvents.ALLOCATED, {
            tenantId,
            paymentId,
            invoiceId: dto.invoiceId,
            allocatedMinor: dto.allocatedMinor,
            currency: payment.currency,
            invoiceStatus: newInvoiceStatus,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`allocate: payment ${payment.reference} → invoice ${invoice.invoiceNumber ?? dto.invoiceId} ` +
            `(${dto.allocatedMinor} ${payment.currency}) — invoice now ${newInvoiceStatus} — tenant ${tenantId}`);
        return updated;
    }
    async reconcile(id, tenantId, actorId) {
        const payment = await this.paymentRepository.findByIdOrFail(id, tenantId);
        if (!payment.gatewayPaymentId) {
            throw new common_1.BadRequestException(`Payment ${id} has no gateway payment ID — cannot reconcile`);
        }
        const adapter = this.adapter(payment.gateway);
        if (!adapter) {
            throw new common_1.BadRequestException(`No gateway adapter for "${payment.gateway}" — cannot reconcile`);
        }
        const previousStatus = payment.status;
        const result = await adapter.reconcile({
            gatewayPaymentId: payment.gatewayPaymentId,
        });
        await this.paymentRepository.update(id, tenantId, {
            gatewayStatus: result.gatewayStatus,
            updatedById: actorId,
        });
        const gatewaySucceeded = ['succeeded', 'captured', 'paid'].includes(result.gatewayStatus.toLowerCase());
        const gatewayFailed = ['failed', 'cancelled', 'expired'].includes(result.gatewayStatus.toLowerCase());
        let updated;
        if (gatewaySucceeded && payment.status === 'authorized') {
            updated = await this.capture(id, {}, tenantId, actorId);
        }
        else if (gatewayFailed && !['failed', 'cancelled', 'captured'].includes(payment.status)) {
            updated = await this.fail(id, { reason: `Reconciled: ${result.gatewayStatus}` }, tenantId, actorId);
        }
        else {
            updated = await this.paymentRepository.findByIdOrFail(id, tenantId);
        }
        await this.eventEmitter.emitAsync(payment_events_1.PaymentEvents.RECONCILED, {
            tenantId,
            paymentId: id,
            gatewayPaymentId: payment.gatewayPaymentId,
            previousStatus,
            newStatus: updated.status,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async findById(id, tenantId) {
        return this.paymentRepository.findByIdOrFail(id, tenantId);
    }
    async findAll(tenantId, opts = {}) {
        return this.paymentRepository.findAll(tenantId, opts);
    }
    async findAllocations(paymentId, tenantId) {
        await this.paymentRepository.findByIdOrFail(paymentId, tenantId);
        return this.paymentRepository.findAllocationsByPayment(paymentId, tenantId);
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(6, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [payment_repository_1.PaymentRepository,
        invoice_repository_1.InvoiceRepository,
        journal_repository_1.JournalRepository,
        double_entry_service_1.DoubleEntryService,
        accounting_period_service_1.AccountingPeriodService,
        event_emitter_1.EventEmitter2,
        typeorm_2.DataSource])
], PaymentService);
//# sourceMappingURL=payment.service.js.map