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
var SubscriptionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const subscription_repository_1 = require("../repositories/subscription.repository");
const package_service_1 = require("../../package/services/package.service");
const subscription_events_1 = require("../events/subscription.events");
const ALLOWED_TRANSITIONS = {
    trialing: ['active', 'expired', 'cancelled'],
    active: ['past_due', 'cancelled', 'paused'],
    past_due: ['active', 'expired'],
    cancelled: [],
    expired: [],
    paused: ['active', 'cancelled'],
};
let SubscriptionService = SubscriptionService_1 = class SubscriptionService {
    constructor(subscriptionRepository, packageService, eventEmitter) {
        this.subscriptionRepository = subscriptionRepository;
        this.packageService = packageService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SubscriptionService_1.name);
    }
    async create(dto, tenantId, actorId) {
        const existing = await this.subscriptionRepository.findActiveByTenant(tenantId);
        if (existing) {
            throw new common_1.ConflictException(`Tenant already has an active subscription (${existing.id}). Cancel it first.`);
        }
        const pkg = await this.packageService.findOne(dto.packageId);
        if (pkg.status !== 'active') {
            throw new common_1.BadRequestException(`Package "${pkg.name}" is not active`);
        }
        const now = new Date();
        const billingCycle = dto.billingCycle ?? 'monthly';
        const hasTrial = pkg.trialDays > 0;
        const initialStatus = hasTrial ? 'trialing' : 'active';
        const trialEnd = hasTrial
            ? new Date(now.getTime() + pkg.trialDays * 86_400_000)
            : null;
        const periodEnd = this.computePeriodEnd(now, billingCycle);
        const price = billingCycle === 'annual'
            ? pkg.priceAnnualMinorUnits
            : pkg.priceMonthlyMinorUnits;
        const entity = await this.subscriptionRepository.create({
            tenantId,
            packageId: pkg.id,
            tierKey: pkg.tierKey,
            status: initialStatus,
            billingCycle,
            priceMinorUnits: price,
            currency: pkg.currency,
            periodStart: now,
            periodEnd,
            trialEnd,
            featuresSnapshot: { ...pkg.features },
            limitsSnapshot: { ...pkg.limits },
            isDeleted: false,
        });
        const eventName = hasTrial ? subscription_events_1.SubscriptionEvents.TRIAL_STARTED : subscription_events_1.SubscriptionEvents.ACTIVATED;
        await this.emitEvent(eventName, entity, actorId);
        this.logger.log(`Subscription created: ${entity.id} tenant=${tenantId} tier=${pkg.tierKey}`);
        return entity;
    }
    async findActiveForTenant(tenantId) {
        return this.subscriptionRepository.findActiveByTenant(tenantId);
    }
    async findAllForTenant(tenantId) {
        return this.subscriptionRepository.findAllByTenant(tenantId);
    }
    async findOne(id) {
        const entity = await this.subscriptionRepository.findById(id);
        if (!entity)
            throw new common_1.NotFoundException(`Subscription ${id} not found`);
        return entity;
    }
    async activate(id, dto, actorId) {
        const sub = await this.findOne(id);
        this.assertTransition(sub.status, 'active');
        await this.subscriptionRepository.updateStatus(id, 'active', {
            externalSubId: dto.externalSubId ?? sub.externalSubId ?? undefined,
        });
        const updated = await this.findOne(id);
        await this.emitEvent(subscription_events_1.SubscriptionEvents.ACTIVATED, updated, actorId);
        return updated;
    }
    async cancel(id, dto, actorId) {
        const sub = await this.findOne(id);
        this.assertTransition(sub.status, 'cancelled');
        await this.subscriptionRepository.updateStatus(id, 'cancelled', {
            cancelledAt: new Date(),
            cancelReason: dto.reason,
        });
        const updated = await this.findOne(id);
        await this.eventEmitter.emitAsync(subscription_events_1.SubscriptionEvents.CANCELLED, {
            ...this.buildPayload(updated, actorId),
            reason: dto.reason,
        });
        this.logger.log(`Subscription cancelled: ${id} tenant=${sub.tenantId}`);
        return updated;
    }
    async expire(id, actorId = 'scheduler') {
        const sub = await this.findOne(id);
        this.assertTransition(sub.status, 'expired');
        await this.subscriptionRepository.updateStatus(id, 'expired');
        const updated = await this.findOne(id);
        await this.emitEvent(subscription_events_1.SubscriptionEvents.EXPIRED, updated, actorId);
        this.logger.log(`Subscription expired: ${id} tenant=${sub.tenantId}`);
        return updated;
    }
    async markPastDue(id, actorId = 'billing-webhook') {
        const sub = await this.findOne(id);
        this.assertTransition(sub.status, 'past_due');
        await this.subscriptionRepository.updateStatus(id, 'past_due');
        const updated = await this.findOne(id);
        await this.emitEvent(subscription_events_1.SubscriptionEvents.PAST_DUE, updated, actorId);
        return updated;
    }
    async pause(id, actorId) {
        const sub = await this.findOne(id);
        this.assertTransition(sub.status, 'paused');
        await this.subscriptionRepository.updateStatus(id, 'paused');
        const updated = await this.findOne(id);
        await this.emitEvent(subscription_events_1.SubscriptionEvents.PAUSED, updated, actorId);
        return updated;
    }
    async resume(id, actorId) {
        const sub = await this.findOne(id);
        this.assertTransition(sub.status, 'active');
        await this.subscriptionRepository.updateStatus(id, 'active');
        const updated = await this.findOne(id);
        await this.emitEvent(subscription_events_1.SubscriptionEvents.RESUMED, updated, actorId);
        return updated;
    }
    async processExpiredTrials() {
        const expired = await this.subscriptionRepository.findExpiredTrials(new Date());
        for (const sub of expired) {
            await this.expire(sub.id);
        }
        if (expired.length > 0) {
            this.logger.log(`Expired ${expired.length} trial subscription(s)`);
        }
        return expired.length;
    }
    assertTransition(from, to) {
        const allowed = ALLOWED_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new common_1.BadRequestException(`Cannot transition from "${from}" to "${to}". Allowed: [${allowed.join(', ') || 'none'}]`);
        }
    }
    async emitEvent(event, entity, actorId) {
        await this.eventEmitter.emitAsync(event, this.buildPayload(entity, actorId));
    }
    buildPayload(entity, actorId) {
        return {
            tenantId: entity.tenantId, subscriptionId: entity.id,
            packageId: entity.packageId, tierKey: entity.tierKey,
            actorId, timestamp: new Date().toISOString(),
        };
    }
    computePeriodEnd(from, cycle) {
        const d = new Date(from);
        switch (cycle) {
            case 'annual':
                d.setFullYear(d.getFullYear() + 1);
                break;
            case 'one_time':
                d.setFullYear(d.getFullYear() + 100);
                break;
            default: d.setMonth(d.getMonth() + 1);
        }
        return d;
    }
};
exports.SubscriptionService = SubscriptionService;
exports.SubscriptionService = SubscriptionService = SubscriptionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [subscription_repository_1.SubscriptionRepository,
        package_service_1.PackageService,
        event_emitter_1.EventEmitter2])
], SubscriptionService);
//# sourceMappingURL=subscription.service.js.map