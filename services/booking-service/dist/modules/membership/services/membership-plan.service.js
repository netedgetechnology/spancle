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
var MembershipPlanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipPlanService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const membership_plan_repository_1 = require("../repositories/membership-plan.repository");
const membership_events_1 = require("../events/membership.events");
let MembershipPlanService = MembershipPlanService_1 = class MembershipPlanService {
    constructor(planRepository, eventEmitter) {
        this.planRepository = planRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(MembershipPlanService_1.name);
    }
    async create(dto, tenantId, actorId) {
        const existing = await this.planRepository.findBySlug(dto.slug, tenantId);
        if (existing) {
            throw new common_1.ConflictException(`A plan with slug "${dto.slug}" already exists`);
        }
        this.logger.log(`Creating membership plan "${dto.name}" — tenant: ${tenantId}`);
        const plan = await this.planRepository.create({
            tenantId,
            name: dto.name,
            slug: dto.slug.toLowerCase().trim(),
            description: dto.description ?? null,
            membershipType: dto.membershipType,
            currency: dto.currency ?? 'GBP',
            billingCycle: dto.billingCycle ?? 'monthly',
            priceMinor: dto.priceMinor ?? 0,
            setupFeeMinor: dto.setupFeeMinor ?? 0,
            trialDays: dto.trialDays ?? 0,
            autoRenew: dto.autoRenew ?? true,
            gracePeriodDays: dto.gracePeriodDays ?? 3,
            maxMembers: dto.maxMembers ?? null,
            maxFamilyDependants: dto.maxFamilyDependants ?? null,
            maxCorporateSeats: dto.maxCorporateSeats ?? null,
            refundOnCancellation: dto.refundOnCancellation ?? false,
            isPublic: dto.isPublic ?? true,
            sortOrder: dto.sortOrder ?? 0,
            isActive: true,
            createdById: actorId,
            updatedById: actorId,
        });
        if (dto.benefits?.length) {
            await Promise.all(dto.benefits.map((b, i) => this.planRepository.createBenefit({
                tenantId,
                planId: plan.id,
                benefitType: b.benefitType,
                unitsPerPeriod: b.unitsPerPeriod ?? null,
                periodType: b.periodType ?? null,
                resetDay: b.resetDay ?? 1,
                rolloverAllowed: b.rolloverAllowed ?? false,
                maxRolloverUnits: b.maxRolloverUnits ?? null,
                transferable: b.transferable ?? false,
                expiresWithMembership: b.expiresWithMembership ?? true,
                sortOrder: b.sortOrder ?? i,
            })));
        }
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.PLAN_CREATED, {
            tenantId, planId: plan.id, actorId, timestamp: new Date().toISOString(),
        });
        return plan;
    }
    async findAll(tenantId, activeOnly = false) {
        return this.planRepository.findAll(tenantId, activeOnly);
    }
    async findOne(id, tenantId) {
        return this.planRepository.findByIdOrFail(id, tenantId);
    }
    async findBenefits(planId, tenantId) {
        await this.planRepository.findByIdOrFail(planId, tenantId);
        return this.planRepository.findBenefits(planId, tenantId);
    }
    async update(id, dto, tenantId, actorId) {
        await this.planRepository.findByIdOrFail(id, tenantId);
        if (dto.slug) {
            const clash = await this.planRepository.findBySlug(dto.slug, tenantId);
            if (clash && clash.id !== id) {
                throw new common_1.ConflictException(`A plan with slug "${dto.slug}" already exists`);
            }
        }
        const updated = await this.planRepository.update(id, tenantId, {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.slug !== undefined && { slug: dto.slug.toLowerCase().trim() }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.priceMinor !== undefined && { priceMinor: dto.priceMinor }),
            ...(dto.billingCycle !== undefined && { billingCycle: dto.billingCycle }),
            ...(dto.autoRenew !== undefined && { autoRenew: dto.autoRenew }),
            ...(dto.gracePeriodDays !== undefined && { gracePeriodDays: dto.gracePeriodDays }),
            ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
            updatedById: actorId,
        });
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.PLAN_UPDATED, {
            tenantId, planId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async addBenefit(planId, dto, tenantId) {
        await this.planRepository.findByIdOrFail(planId, tenantId);
        return this.planRepository.createBenefit({
            tenantId,
            planId,
            benefitType: dto.benefitType,
            unitsPerPeriod: dto.unitsPerPeriod ?? null,
            periodType: dto.periodType ?? null,
            resetDay: dto.resetDay ?? 1,
            rolloverAllowed: dto.rolloverAllowed ?? false,
            maxRolloverUnits: dto.maxRolloverUnits ?? null,
            transferable: dto.transferable ?? false,
            expiresWithMembership: dto.expiresWithMembership ?? true,
            sortOrder: dto.sortOrder ?? 0,
        });
    }
    async removeBenefit(benefitId, tenantId) {
        await this.planRepository.deleteBenefit(benefitId, tenantId);
    }
    async archive(id, tenantId, actorId) {
        const plan = await this.planRepository.findByIdOrFail(id, tenantId);
        if (!plan.isActive && plan.isDeleted) {
            throw new common_1.BadRequestException('Plan is already archived');
        }
        await this.planRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(membership_events_1.MembershipEvents.PLAN_ARCHIVED, {
            tenantId, planId: id, actorId, timestamp: new Date().toISOString(),
        });
        this.logger.log(`Plan ${id} archived — tenant: ${tenantId}`);
    }
};
exports.MembershipPlanService = MembershipPlanService;
exports.MembershipPlanService = MembershipPlanService = MembershipPlanService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [membership_plan_repository_1.MembershipPlanRepository,
        event_emitter_1.EventEmitter2])
], MembershipPlanService);
//# sourceMappingURL=membership-plan.service.js.map