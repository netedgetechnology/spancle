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
var EntitlementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entitlement_repository_1 = require("../repositories/entitlement.repository");
const membership_repository_1 = require("../repositories/membership.repository");
const membership_events_1 = require("../events/membership.events");
const entitlement_balance_entity_1 = require("../entities/entitlement-balance.entity");
function nextResetDate(periodType, from) {
    const d = new Date(from);
    switch (periodType) {
        case 'week':
            d.setDate(d.getDate() + 7);
            break;
        case 'month':
            d.setMonth(d.getMonth() + 1);
            break;
        case 'quarter':
            d.setMonth(d.getMonth() + 3);
            break;
        case 'year':
            d.setFullYear(d.getFullYear() + 1);
            break;
        default: return d;
    }
    return d;
}
let EntitlementService = EntitlementService_1 = class EntitlementService {
    constructor(entitlementRepository, membershipRepository, eventEmitter, dataSource) {
        this.entitlementRepository = entitlementRepository;
        this.membershipRepository = membershipRepository;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(EntitlementService_1.name);
    }
    async initialise(membershipId, tenantId, dto) {
        const existing = await this.entitlementRepository.findByBenefitType(membershipId, dto.benefitType, tenantId);
        const now = new Date();
        const resetDate = dto.periodType && dto.periodType !== 'membership_term'
            ? nextResetDate(dto.periodType, now)
            : null;
        if (existing) {
            await this.entitlementRepository.update(existing.id, {
                balance: dto.units,
                baseUnits: dto.units,
                reservedUnits: 0,
                periodType: dto.periodType ?? null,
                nextResetAt: resetDate,
                rolloverAllowed: (dto.rolloverAllowed ?? 0) > 0,
                maxRolloverUnits: dto.maxRolloverUnits ?? null,
                isActive: true,
            });
            return (await this.entitlementRepository.findByBenefitType(membershipId, dto.benefitType, tenantId));
        }
        return this.entitlementRepository.create({
            tenantId,
            membershipId,
            benefitType: dto.benefitType,
            balance: dto.units,
            baseUnits: dto.units,
            reservedUnits: 0,
            periodType: dto.periodType ?? null,
            nextResetAt: resetDate,
            rolloverAllowed: (dto.rolloverAllowed ?? 0) > 0,
            maxRolloverUnits: dto.maxRolloverUnits ?? null,
            totalConsumedLifetime: 0,
            isActive: true,
        });
    }
    async findAll(membershipId, tenantId) {
        await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
        return this.entitlementRepository.findByMembership(membershipId, tenantId);
    }
    async findOne(membershipId, benefitType, tenantId) {
        return this.entitlementRepository.findByBenefitTypeOrFail(membershipId, benefitType, tenantId);
    }
    async consume(membershipId, dto, tenantId, actorId) {
        const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
        if (membership.status !== 'active' && membership.status !== 'trial') {
            throw new common_1.BadRequestException(`Cannot consume entitlements on a membership with status "${membership.status}"`);
        }
        let balanceAfter;
        let balanceBefore;
        let updatedBalance;
        await this.dataSource.transaction(async (manager) => {
            const locked = await this.entitlementRepository.lockBalance(membershipId, dto.benefitType, tenantId, manager);
            if (!locked) {
                throw new common_1.NotFoundException(`Entitlement balance for benefit "${dto.benefitType}" not found`);
            }
            const effective = locked.balance - locked.reservedUnits;
            if (effective < dto.quantity) {
                throw new common_1.BadRequestException(`Insufficient entitlement balance: ${effective} available, ${dto.quantity} requested`);
            }
            balanceBefore = locked.balance;
            balanceAfter = locked.balance - dto.quantity;
            await manager.update(entitlement_balance_entity_1.EntitlementBalanceEntity, { id: locked.id }, {
                balance: balanceAfter,
                totalConsumedLifetime: locked.totalConsumedLifetime + dto.quantity,
            });
            await this.entitlementRepository.insertTransaction({
                tenantId,
                membershipId,
                userId: membership.userId ?? actorId,
                transactionType: 'consume',
                benefitType: dto.benefitType,
                quantityDelta: -dto.quantity,
                balanceBefore,
                balanceAfter,
                referenceType: dto.referenceType ?? null,
                referenceId: dto.referenceId ?? null,
                actorId,
                note: dto.note ?? null,
                metadata: dto.metadata ?? null,
            }, manager);
            await this.entitlementRepository.insertAuditLog({
                tenantId,
                membershipId,
                action: 'entitlement_consumed',
                actorId,
                actorType: 'user',
                previousStatus: null,
                newStatus: null,
                note: `${dto.benefitType}: -${dto.quantity} (${balanceBefore} → ${balanceAfter})`,
            }, manager);
        });
        const result = await this.entitlementRepository.findByBenefitTypeOrFail(membershipId, dto.benefitType, tenantId);
        updatedBalance = result;
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENTITLEMENT_CONSUMED, {
            tenantId, membershipId,
            userId: membership.userId,
            actorId,
            benefitType: dto.benefitType,
            quantityDelta: -dto.quantity,
            balanceAfter,
            referenceType: dto.referenceType,
            referenceId: dto.referenceId,
            timestamp: new Date().toISOString(),
        });
        if (balanceAfter === 0) {
            await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENTITLEMENT_EXHAUSTED, {
                tenantId, membershipId, userId: membership.userId, actorId,
                benefitType: dto.benefitType,
                quantityDelta: 0,
                balanceAfter: 0,
                timestamp: new Date().toISOString(),
            });
        }
        return updatedBalance;
    }
    async refund(membershipId, dto, tenantId, actorId) {
        const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
        let balanceBefore;
        let balanceAfter;
        await this.dataSource.transaction(async (manager) => {
            const locked = await this.entitlementRepository.lockBalance(membershipId, dto.benefitType, tenantId, manager);
            if (!locked) {
                throw new common_1.NotFoundException(`Entitlement balance for benefit "${dto.benefitType}" not found`);
            }
            balanceBefore = locked.balance;
            balanceAfter = locked.balance + dto.quantity;
            await manager.update(entitlement_balance_entity_1.EntitlementBalanceEntity, { id: locked.id }, {
                balance: balanceAfter,
            });
            await this.entitlementRepository.insertTransaction({
                tenantId,
                membershipId,
                userId: membership.userId ?? actorId,
                transactionType: 'refund',
                benefitType: dto.benefitType,
                quantityDelta: +dto.quantity,
                balanceBefore,
                balanceAfter,
                referenceId: dto.originalTransactionId,
                referenceType: 'transaction',
                actorId,
                note: dto.note ?? null,
            }, manager);
            await this.entitlementRepository.insertAuditLog({
                tenantId, membershipId, action: 'entitlement_refunded',
                actorId, actorType: 'user', previousStatus: null, newStatus: null,
                note: `${dto.benefitType}: +${dto.quantity} refund (${balanceBefore} → ${balanceAfter})`,
            }, manager);
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENTITLEMENT_REFUNDED, {
            tenantId, membershipId, userId: membership.userId, actorId,
            benefitType: dto.benefitType, quantityDelta: +dto.quantity, balanceAfter,
            timestamp: new Date().toISOString(),
        });
        return this.entitlementRepository.findByBenefitTypeOrFail(membershipId, dto.benefitType, tenantId);
    }
    async adjust(membershipId, dto, tenantId, actorId) {
        const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
        let balanceBefore;
        let balanceAfter;
        await this.dataSource.transaction(async (manager) => {
            const locked = await this.entitlementRepository.lockBalance(membershipId, dto.benefitType, tenantId, manager);
            if (!locked) {
                throw new common_1.NotFoundException(`Entitlement balance for benefit "${dto.benefitType}" not found`);
            }
            balanceBefore = locked.balance;
            balanceAfter = Math.max(0, locked.balance + dto.delta);
            await manager.update(entitlement_balance_entity_1.EntitlementBalanceEntity, { id: locked.id }, {
                balance: balanceAfter,
            });
            await this.entitlementRepository.insertTransaction({
                tenantId,
                membershipId,
                userId: membership.userId ?? actorId,
                transactionType: 'adjustment',
                benefitType: dto.benefitType,
                quantityDelta: dto.delta,
                balanceBefore,
                balanceAfter,
                actorId,
                note: dto.note,
            }, manager);
            await this.entitlementRepository.insertAuditLog({
                tenantId, membershipId, action: 'entitlement_adjusted',
                actorId, actorType: 'staff', previousStatus: null, newStatus: null,
                note: `${dto.benefitType}: ${dto.delta > 0 ? '+' : ''}${dto.delta} (${balanceBefore} → ${balanceAfter}). ${dto.note}`,
            }, manager);
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENTITLEMENT_ADJUSTED, {
            tenantId, membershipId, userId: membership.userId, actorId,
            benefitType: dto.benefitType, quantityDelta: dto.delta, balanceAfter,
            timestamp: new Date().toISOString(),
        });
        return this.entitlementRepository.findByBenefitTypeOrFail(membershipId, dto.benefitType, tenantId);
    }
    async reserve(membershipId, dto, tenantId, actorId) {
        const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
        if (membership.status !== 'active' && membership.status !== 'trial') {
            throw new common_1.BadRequestException(`Cannot reserve entitlements on a membership with status "${membership.status}"`);
        }
        let balanceAfter;
        await this.dataSource.transaction(async (manager) => {
            const locked = await this.entitlementRepository.lockBalance(membershipId, dto.benefitType, tenantId, manager);
            if (!locked) {
                throw new common_1.NotFoundException(`Entitlement balance for benefit "${dto.benefitType}" not found`);
            }
            const available = locked.balance - locked.reservedUnits;
            if (available < dto.quantity) {
                throw new common_1.BadRequestException(`Cannot reserve ${dto.quantity} unit(s): only ${available} available`);
            }
            balanceAfter = locked.reservedUnits + dto.quantity;
            await manager.update(entitlement_balance_entity_1.EntitlementBalanceEntity, { id: locked.id }, {
                reservedUnits: balanceAfter,
            });
            await this.entitlementRepository.insertTransaction({
                tenantId, membershipId,
                userId: membership.userId ?? actorId,
                transactionType: 'reserve',
                benefitType: dto.benefitType,
                quantityDelta: 0,
                balanceBefore: locked.balance,
                balanceAfter: locked.balance,
                referenceType: dto.referenceType ?? null,
                referenceId: dto.referenceId ?? null,
                actorId,
                note: `Reserved ${dto.quantity} unit(s)`,
            }, manager);
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENTITLEMENT_RESERVED, {
            tenantId, membershipId, userId: membership.userId, actorId,
            benefitType: dto.benefitType, quantityDelta: dto.quantity,
            balanceAfter, timestamp: new Date().toISOString(),
        });
        return this.entitlementRepository.findByBenefitTypeOrFail(membershipId, dto.benefitType, tenantId);
    }
    async releaseReservation(membershipId, dto, tenantId, actorId) {
        const membership = await this.membershipRepository.findByIdOrFail(membershipId, tenantId);
        await this.dataSource.transaction(async (manager) => {
            const locked = await this.entitlementRepository.lockBalance(membershipId, dto.benefitType, tenantId, manager);
            if (!locked) {
                throw new common_1.NotFoundException(`Entitlement balance for benefit "${dto.benefitType}" not found`);
            }
            const newReserved = Math.max(0, locked.reservedUnits - dto.quantity);
            await manager.update(entitlement_balance_entity_1.EntitlementBalanceEntity, { id: locked.id }, {
                reservedUnits: newReserved,
            });
            await this.entitlementRepository.insertTransaction({
                tenantId, membershipId,
                userId: membership.userId ?? actorId,
                transactionType: 'release',
                benefitType: dto.benefitType,
                quantityDelta: 0,
                balanceBefore: locked.balance,
                balanceAfter: locked.balance,
                referenceType: dto.referenceType ?? null,
                referenceId: dto.referenceId ?? null,
                actorId,
                note: dto.note ?? `Released ${dto.quantity} reserved unit(s)`,
            }, manager);
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENTITLEMENT_RELEASED, {
            tenantId, membershipId, userId: membership.userId, actorId,
            benefitType: dto.benefitType, quantityDelta: -dto.quantity,
            balanceAfter: 0, timestamp: new Date().toISOString(),
        });
        return this.entitlementRepository.findByBenefitTypeOrFail(membershipId, dto.benefitType, tenantId);
    }
    async resetBalance(balance, actorId = 'system') {
        const rollover = balance.rolloverAllowed
            ? Math.min(balance.balance, balance.maxRolloverUnits ?? Infinity)
            : 0;
        const newBalance = balance.baseUnits + rollover;
        const now = new Date();
        const nextReset = balance.periodType && balance.periodType !== 'membership_term'
            ? nextResetDate(balance.periodType, now)
            : null;
        await this.dataSource.transaction(async (manager) => {
            const locked = await this.entitlementRepository.lockBalance(balance.membershipId, balance.benefitType, balance.tenantId, manager);
            if (!locked)
                return;
            await manager.update(entitlement_balance_entity_1.EntitlementBalanceEntity, { id: locked.id }, {
                balance: newBalance,
                lastResetAt: now,
                nextResetAt: nextReset,
            });
            await this.entitlementRepository.insertTransaction({
                tenantId: balance.tenantId,
                membershipId: balance.membershipId,
                userId: actorId,
                transactionType: 'reset',
                benefitType: balance.benefitType,
                quantityDelta: newBalance - locked.balance,
                balanceBefore: locked.balance,
                balanceAfter: newBalance,
                actorId,
                note: `Period reset: base=${balance.baseUnits} rollover=${rollover}`,
            }, manager);
            await this.entitlementRepository.insertAuditLog({
                tenantId: balance.tenantId,
                membershipId: balance.membershipId,
                action: 'entitlement_balance_reset',
                actorId, actorType: 'system',
                previousStatus: null, newStatus: null,
                note: `${balance.benefitType}: reset to ${newBalance} (rollover=${rollover})`,
            }, manager);
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.ENTITLEMENT_BALANCE_RESET, {
            tenantId: balance.tenantId,
            membershipId: balance.membershipId,
            userId: null,
            actorId,
            benefitType: balance.benefitType,
            quantityDelta: newBalance - balance.balance,
            balanceAfter: newBalance,
            timestamp: now.toISOString(),
        });
    }
    async autoResetDueBalances() {
        const batchSize = 100;
        const candidates = await this.entitlementRepository.findDueForReset(batchSize);
        let count = 0;
        for (const b of candidates) {
            try {
                await this.resetBalance(b);
                count++;
            }
            catch (err) {
                this.logger.warn(`autoResetDueBalances: ${b.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoResetDueBalances: reset ${count} balance(s)`);
        return count;
    }
    async autoReleaseStaleReservations() {
        const candidates = await this.entitlementRepository.findStaleReservations(100);
        let count = 0;
        for (const b of candidates) {
            try {
                await this.entitlementRepository.update(b.id, { reservedUnits: 0 });
                count++;
            }
            catch (err) {
                this.logger.warn(`autoReleaseStaleReservations: ${b.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoReleaseStaleReservations: cleared ${count} stale reservation(s)`);
        return count;
    }
    async deactivateAll(membershipId, tenantId, actorId) {
        await this.dataSource.transaction(async (manager) => {
            await this.entitlementRepository.deactivateByMembership(membershipId, tenantId, manager);
            await this.entitlementRepository.insertAuditLog({
                tenantId, membershipId, action: 'entitlements_deactivated',
                actorId, actorType: 'system', previousStatus: null, newStatus: null,
                note: 'All entitlement balances deactivated on membership termination',
            }, manager);
        });
        this.logger.log(`Entitlements deactivated — membership: ${membershipId}`);
    }
};
exports.EntitlementService = EntitlementService;
exports.EntitlementService = EntitlementService = EntitlementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [entitlement_repository_1.EntitlementRepository,
        membership_repository_1.MembershipRepository,
        event_emitter_1.EventEmitter2,
        typeorm_2.DataSource])
], EntitlementService);
//# sourceMappingURL=entitlement.service.js.map