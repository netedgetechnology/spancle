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
var DisputeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const dispute_repository_1 = require("../repositories/dispute.repository");
const payment_repository_1 = require("../repositories/payment.repository");
const double_entry_service_1 = require("./double-entry.service");
const accounting_period_service_1 = require("./accounting-period.service");
const dispute_events_1 = require("../events/dispute.events");
const dispute_entity_1 = require("../entities/dispute.entity");
const payment_entity_1 = require("../entities/payment.entity");
const GL = {
    MERCHANT_SETTLEMENT: '1130',
    CHARGEBACKS_RECEIVABLE: '1190',
    PROCESSING_FEES: '5100',
    CHARGEBACK_EXPENSE: '5210',
};
const ALLOWED_TRANSITIONS = {
    opened: ['under_review', 'won', 'lost', 'cancelled'],
    under_review: ['won', 'lost', 'cancelled'],
    won: [],
    lost: [],
    cancelled: [],
};
function assertTransitionAllowed(from, to) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
        throw new common_1.BadRequestException(`Cannot transition dispute from "${from}" to "${to}". ` +
            `Allowed: [${ALLOWED_TRANSITIONS[from].join(', ') || 'none'}]`);
    }
}
async function canRestorePaymentToCaptured(disputeRepository, paymentId, tenantId, manager) {
    const [lostAmount, openCount] = await Promise.all([
        disputeRepository.totalLostDisputedAmount(paymentId, tenantId, manager),
        disputeRepository.countOpenDisputesForPayment(paymentId, tenantId, manager),
    ]);
    return lostAmount === 0 && openCount === 0;
}
let DisputeService = DisputeService_1 = class DisputeService {
    constructor(disputeRepository, paymentRepository, doubleEntryService, periodService, eventEmitter, dataSource) {
        this.disputeRepository = disputeRepository;
        this.paymentRepository = paymentRepository;
        this.doubleEntryService = doubleEntryService;
        this.periodService = periodService;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(DisputeService_1.name);
    }
    async openDispute(dto, tenantId, actorId) {
        const openedAt = new Date(dto.openedAt);
        await this.periodService.assertOpen(tenantId, openedAt);
        const disputeNumber = await this.disputeRepository.nextDisputeNumber(tenantId);
        const dispute = await this.dataSource.transaction(async (manager) => {
            const payment = await manager
                .createQueryBuilder(payment_entity_1.PaymentEntity, 'p')
                .setLock('pessimistic_write')
                .where('p.id = :id', { id: dto.paymentId })
                .andWhere('p.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!payment) {
                throw new common_1.BadRequestException(`Payment ${dto.paymentId} not found`);
            }
            if (payment.status !== 'captured' && payment.status !== 'chargedback') {
                throw new common_1.BadRequestException(`Cannot open dispute on payment with status "${payment.status}". ` +
                    `Payment must be captured.`);
            }
            if (dto.disputedAmountMinor <= 0) {
                throw new common_1.BadRequestException('disputedAmountMinor must be > 0');
            }
            if (dto.disputedAmountMinor > payment.capturedAmountMinor) {
                throw new common_1.BadRequestException(`disputedAmountMinor (${dto.disputedAmountMinor}) exceeds ` +
                    `payment capturedAmountMinor (${payment.capturedAmountMinor})`);
            }
            const alreadyDisputed = await this.disputeRepository.totalActiveDisputedAmount(dto.paymentId, tenantId, manager);
            if (alreadyDisputed + dto.disputedAmountMinor > payment.capturedAmountMinor) {
                throw new common_1.BadRequestException(`Opening this dispute would bring total disputed amount ` +
                    `(${alreadyDisputed + dto.disputedAmountMinor}) above ` +
                    `capturedAmountMinor (${payment.capturedAmountMinor})`);
            }
            const totalCr = dto.disputedAmountMinor + dto.feeAmountMinor;
            const journalLines = [
                {
                    accountCode: GL.CHARGEBACKS_RECEIVABLE,
                    debitMinor: dto.disputedAmountMinor,
                    creditMinor: 0,
                    currency: dto.currency,
                    description: `Chargeback receivable — ${disputeNumber}`,
                },
                ...(dto.feeAmountMinor > 0 ? [{
                        accountCode: GL.PROCESSING_FEES,
                        debitMinor: dto.feeAmountMinor,
                        creditMinor: 0,
                        currency: dto.currency,
                        description: `Chargeback fee — ${disputeNumber}`,
                    }] : []),
                {
                    accountCode: GL.MERCHANT_SETTLEMENT,
                    debitMinor: 0,
                    creditMinor: totalCr,
                    currency: dto.currency,
                    description: `Funds withdrawn — dispute ${disputeNumber}`,
                },
            ];
            const entry = await this.doubleEntryService.postWithManager({
                tenantId,
                entryType: 'chargeback',
                sourceType: 'dispute',
                sourceId: dto.paymentId,
                description: `Dispute opened — ${disputeNumber} — gateway: ${dto.gatewayDisputeId}`,
                postedAt: openedAt,
                currency: dto.currency,
                lines: journalLines,
            }, manager);
            const d = await this.disputeRepository.create({
                tenantId,
                disputeNumber,
                paymentId: dto.paymentId,
                gateway: dto.gateway,
                gatewayDisputeId: dto.gatewayDisputeId,
                reason: dto.reason,
                disputedAmountMinor: dto.disputedAmountMinor,
                feeAmountMinor: dto.feeAmountMinor,
                currency: dto.currency,
                openedAt,
                evidenceDueAt: dto.evidenceDueAt ? new Date(dto.evidenceDueAt) : undefined,
                metadata: dto.metadata,
                createdById: actorId,
            }, manager);
            await this.disputeRepository.update(d.id, tenantId, { journalEntryId: entry.id, updatedById: actorId }, manager);
            d.journalEntryId = entry.id;
            const newTotal = alreadyDisputed + dto.disputedAmountMinor;
            if (newTotal === payment.capturedAmountMinor && payment.status === 'captured') {
                await manager.update(payment_entity_1.PaymentEntity, { id: dto.paymentId, tenantId }, {
                    status: 'chargedback',
                    updatedById: actorId,
                });
            }
            return d;
        });
        await this.eventEmitter.emitAsync(dispute_events_1.DisputeEvents.OPENED, {
            tenantId,
            disputeId: dispute.id,
            disputeNumber: dispute.disputeNumber,
            paymentId: dispute.paymentId,
            gatewayDisputeId: dispute.gatewayDisputeId,
            disputedAmountMinor: dispute.disputedAmountMinor,
            currency: dispute.currency,
            status: 'opened',
            feeAmountMinor: dispute.feeAmountMinor,
            reason: dispute.reason,
            evidenceDueAt: dispute.evidenceDueAt?.toISOString() ?? null,
            journalEntryId: dispute.journalEntryId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`openDispute: ${dispute.disputeNumber} opened for payment ${dto.paymentId} ` +
            `(${dispute.disputedAmountMinor} ${dispute.currency}) — tenant ${tenantId}`);
        return dispute;
    }
    async markUnderReview(id, tenantId, actorId) {
        const dispute = await this.disputeRepository.findByIdOrFail(id, tenantId);
        assertTransitionAllowed(dispute.status, 'under_review');
        await this.disputeRepository.update(id, tenantId, {
            status: 'under_review',
            updatedById: actorId,
        });
        const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(dispute_events_1.DisputeEvents.UNDER_REVIEW, {
            tenantId,
            disputeId: id,
            disputeNumber: updated.disputeNumber,
            paymentId: updated.paymentId,
            gatewayDisputeId: updated.gatewayDisputeId,
            disputedAmountMinor: updated.disputedAmountMinor,
            currency: updated.currency,
            status: 'under_review',
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async resolveWon(id, dto, tenantId, actorId) {
        const resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : new Date();
        await this.periodService.assertOpen(tenantId, resolvedAt);
        const resolutionEntry = await this.dataSource.transaction(async (manager) => {
            const locked = await manager
                .createQueryBuilder(dispute_entity_1.DisputeEntity, 'd')
                .setLock('pessimistic_write')
                .where('d.id = :id', { id })
                .andWhere('d.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!locked)
                throw new common_1.BadRequestException(`Dispute ${id} not found`);
            if (locked.resolutionJournalEntryId) {
                throw new common_1.ConflictException(`Dispute ${id} already resolved — concurrent request`);
            }
            assertTransitionAllowed(locked.status, 'won');
            const payment = await manager
                .createQueryBuilder(payment_entity_1.PaymentEntity, 'p')
                .setLock('pessimistic_write')
                .where('p.id = :id', { id: locked.paymentId })
                .andWhere('p.tenantId = :tid', { tid: tenantId })
                .getOne();
            const entry = await this.doubleEntryService.postWithManager({
                tenantId,
                entryType: 'chargeback',
                sourceType: 'dispute',
                sourceId: id,
                description: `Dispute won — ${locked.disputeNumber}`,
                postedAt: resolvedAt,
                currency: locked.currency,
                lines: [
                    {
                        accountCode: GL.MERCHANT_SETTLEMENT,
                        debitMinor: locked.disputedAmountMinor,
                        creditMinor: 0,
                        currency: locked.currency,
                        description: `Funds recovered — ${locked.disputeNumber}`,
                    },
                    {
                        accountCode: GL.CHARGEBACKS_RECEIVABLE,
                        debitMinor: 0,
                        creditMinor: locked.disputedAmountMinor,
                        currency: locked.currency,
                        description: `Chargeback receivable cleared — ${locked.disputeNumber}`,
                    },
                ],
            }, manager);
            await manager.update(dispute_entity_1.DisputeEntity, { id, tenantId }, {
                status: 'won',
                resolution: 'won',
                resolvedAt,
                resolutionJournalEntryId: entry.id,
                updatedById: actorId,
            });
            if (payment?.status === 'chargedback') {
                const restore = await canRestorePaymentToCaptured(this.disputeRepository, locked.paymentId, tenantId, manager);
                if (restore) {
                    await manager.update(payment_entity_1.PaymentEntity, { id: locked.paymentId, tenantId }, {
                        status: 'captured',
                        updatedById: actorId,
                    });
                }
            }
            return entry;
        });
        const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(dispute_events_1.DisputeEvents.WON, {
            tenantId,
            disputeId: id,
            disputeNumber: updated.disputeNumber,
            paymentId: updated.paymentId,
            gatewayDisputeId: updated.gatewayDisputeId,
            disputedAmountMinor: updated.disputedAmountMinor,
            currency: updated.currency,
            status: 'won',
            resolutionJournalEntryId: resolutionEntry.id,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`resolveWon: dispute ${updated.disputeNumber} won — ` +
            `${updated.disputedAmountMinor} ${updated.currency} recovered — tenant ${tenantId}`);
        return updated;
    }
    async resolveLost(id, dto, tenantId, actorId) {
        const resolvedAt = dto.resolvedAt ? new Date(dto.resolvedAt) : new Date();
        await this.periodService.assertOpen(tenantId, resolvedAt);
        const resolutionEntry = await this.dataSource.transaction(async (manager) => {
            const locked = await manager
                .createQueryBuilder(dispute_entity_1.DisputeEntity, 'd')
                .setLock('pessimistic_write')
                .where('d.id = :id', { id })
                .andWhere('d.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!locked)
                throw new common_1.BadRequestException(`Dispute ${id} not found`);
            if (locked.resolutionJournalEntryId) {
                throw new common_1.ConflictException(`Dispute ${id} already resolved — concurrent request`);
            }
            assertTransitionAllowed(locked.status, 'lost');
            await manager
                .createQueryBuilder(payment_entity_1.PaymentEntity, 'p')
                .setLock('pessimistic_write')
                .where('p.id = :id', { id: locked.paymentId })
                .andWhere('p.tenantId = :tid', { tid: tenantId })
                .getOne();
            const entry = await this.doubleEntryService.postWithManager({
                tenantId,
                entryType: 'chargeback',
                sourceType: 'dispute',
                sourceId: id,
                description: `Dispute lost — write-off — ${locked.disputeNumber}`,
                postedAt: resolvedAt,
                currency: locked.currency,
                lines: [
                    {
                        accountCode: GL.CHARGEBACK_EXPENSE,
                        debitMinor: locked.disputedAmountMinor,
                        creditMinor: 0,
                        currency: locked.currency,
                        description: `Chargeback loss — ${locked.disputeNumber}`,
                    },
                    {
                        accountCode: GL.CHARGEBACKS_RECEIVABLE,
                        debitMinor: 0,
                        creditMinor: locked.disputedAmountMinor,
                        currency: locked.currency,
                        description: `Chargeback receivable written off — ${locked.disputeNumber}`,
                    },
                ],
            }, manager);
            await manager.update(dispute_entity_1.DisputeEntity, { id, tenantId }, {
                status: 'lost',
                resolution: 'lost',
                resolvedAt,
                resolutionJournalEntryId: entry.id,
                updatedById: actorId,
            });
            return entry;
        });
        const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(dispute_events_1.DisputeEvents.LOST, {
            tenantId,
            disputeId: id,
            disputeNumber: updated.disputeNumber,
            paymentId: updated.paymentId,
            gatewayDisputeId: updated.gatewayDisputeId,
            disputedAmountMinor: updated.disputedAmountMinor,
            currency: updated.currency,
            status: 'lost',
            resolutionJournalEntryId: resolutionEntry.id,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`resolveLost: dispute ${updated.disputeNumber} lost — ` +
            `${updated.disputedAmountMinor} ${updated.currency} written off — tenant ${tenantId}`);
        return updated;
    }
    async cancelDispute(id, dto, tenantId, actorId) {
        const now = new Date();
        await this.periodService.assertOpen(tenantId, now);
        await this.dataSource.transaction(async (manager) => {
            const locked = await manager
                .createQueryBuilder(dispute_entity_1.DisputeEntity, 'd')
                .setLock('pessimistic_write')
                .where('d.id = :id', { id })
                .andWhere('d.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (!locked)
                throw new common_1.BadRequestException(`Dispute ${id} not found`);
            assertTransitionAllowed(locked.status, 'cancelled');
            await manager
                .createQueryBuilder(payment_entity_1.PaymentEntity, 'p')
                .setLock('pessimistic_write')
                .where('p.id = :id', { id: locked.paymentId })
                .andWhere('p.tenantId = :tid', { tid: tenantId })
                .getOne();
            if (locked.journalEntryId) {
                const reversalEntry = await this.doubleEntryService.postWithManager({
                    tenantId,
                    entryType: 'chargeback',
                    sourceType: 'dispute',
                    sourceId: id,
                    description: `Dispute cancelled — principal released — ${locked.disputeNumber}`,
                    postedAt: now,
                    currency: locked.currency,
                    lines: [
                        {
                            accountCode: GL.CHARGEBACKS_RECEIVABLE,
                            debitMinor: 0,
                            creditMinor: locked.disputedAmountMinor,
                            currency: locked.currency,
                            description: `Chargeback receivable cancelled — ${locked.disputeNumber}`,
                        },
                        {
                            accountCode: GL.MERCHANT_SETTLEMENT,
                            debitMinor: locked.disputedAmountMinor,
                            creditMinor: 0,
                            currency: locked.currency,
                            description: `Principal released — dispute ${locked.disputeNumber}`,
                        },
                    ],
                }, manager);
                await manager.update(dispute_entity_1.DisputeEntity, { id, tenantId }, {
                    resolutionJournalEntryId: reversalEntry.id,
                });
            }
            await manager.update(dispute_entity_1.DisputeEntity, { id, tenantId }, {
                status: 'cancelled',
                resolution: 'cancelled',
                resolvedAt: now,
                updatedById: actorId,
            });
            const payment = await manager.findOne(payment_entity_1.PaymentEntity, {
                where: { id: locked.paymentId, tenantId },
            });
            if (payment?.status === 'chargedback') {
                const restore = await canRestorePaymentToCaptured(this.disputeRepository, locked.paymentId, tenantId, manager);
                if (restore) {
                    await manager.update(payment_entity_1.PaymentEntity, { id: locked.paymentId, tenantId }, {
                        status: 'captured',
                        updatedById: actorId,
                    });
                }
            }
        });
        const updated = await this.disputeRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(dispute_events_1.DisputeEvents.CANCELLED, {
            tenantId,
            disputeId: id,
            disputeNumber: updated.disputeNumber,
            paymentId: updated.paymentId,
            gatewayDisputeId: updated.gatewayDisputeId,
            disputedAmountMinor: updated.disputedAmountMinor,
            currency: updated.currency,
            status: 'cancelled',
            reason: dto.reason ?? null,
            timestamp: now.toISOString(),
        });
        this.logger.log(`cancelDispute: dispute ${updated.disputeNumber} cancelled — tenant ${tenantId}`);
        return updated;
    }
    async findById(id, tenantId) {
        return this.disputeRepository.findByIdOrFail(id, tenantId);
    }
    async findByGatewayDisputeId(gateway, gatewayDisputeId, tenantId) {
        return this.disputeRepository.findByGatewayDisputeId(gateway, gatewayDisputeId, tenantId);
    }
    async findByPayment(paymentId, tenantId) {
        return this.disputeRepository.findByPayment(paymentId, tenantId);
    }
    async findAll(tenantId, opts = {}) {
        return this.disputeRepository.findAll(tenantId, opts);
    }
};
exports.DisputeService = DisputeService;
exports.DisputeService = DisputeService = DisputeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(5, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [dispute_repository_1.DisputeRepository,
        payment_repository_1.PaymentRepository,
        double_entry_service_1.DoubleEntryService,
        accounting_period_service_1.AccountingPeriodService,
        event_emitter_1.EventEmitter2,
        typeorm_2.DataSource])
], DisputeService);
//# sourceMappingURL=dispute.service.js.map