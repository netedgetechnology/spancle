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
var PlanService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const plan_repository_1 = require("../repositories/plan.repository");
const package_service_1 = require("../../package/services/package.service");
const plan_events_1 = require("../events/plan.events");
let PlanService = PlanService_1 = class PlanService {
    constructor(planRepository, packageService, eventEmitter) {
        this.planRepository = planRepository;
        this.packageService = packageService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(PlanService_1.name);
    }
    /**
     * Upserts the active plan for a tenant.
     * Called by SubscriptionService when a subscription is activated.
     * Deactivates any previous plan before creating the new one.
     */
    async upsertForTenant(dto, actorId) {
        // Verify the package exists
        await this.packageService.findOne(dto.packageId);
        // Deactivate existing plan
        await this.planRepository.deactivateByTenant(dto.tenantId);
        const entity = await this.planRepository.create({
            tenantId: dto.tenantId,
            packageId: dto.packageId,
            tierKey: dto.tierKey,
            featureOverrides: dto.featureOverrides ?? {},
            limitOverrides: dto.limitOverrides ?? {},
            isActive: true,
            isDeleted: false,
        });
        await this.eventEmitter.emitAsync(plan_events_1.PlanEvents.CREATED, {
            tenantId: dto.tenantId, planId: entity.id, actorId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Plan created for tenant ${dto.tenantId} → tier=${dto.tierKey}`);
        return entity;
    }
    async findForTenant(tenantId) {
        return this.planRepository.findByTenant(tenantId);
    }
    async findOne(id) {
        const entity = await this.planRepository.findById(id);
        if (!entity)
            throw new common_1.NotFoundException(`Plan ${id} not found`);
        return entity;
    }
    /**
     * Updates feature/limit overrides for a tenant plan.
     * Used by superadmin to grant enterprise-custom limits.
     * Merges on top of existing overrides — never full-replaces.
     */
    async updateOverrides(id, dto, actorId) {
        const plan = await this.findOne(id);
        const updated = await this.planRepository.update(id, {
            ...(dto.featureOverrides !== undefined && {
                featureOverrides: { ...plan.featureOverrides, ...dto.featureOverrides },
            }),
            ...(dto.limitOverrides !== undefined && {
                limitOverrides: { ...plan.limitOverrides, ...dto.limitOverrides },
            }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        });
        await this.eventEmitter.emitAsync(plan_events_1.PlanEvents.UPDATED, {
            tenantId: plan.tenantId, planId: id, actorId,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    /**
     * Returns the effective resolved limits for a tenant.
     * Merges package.limits with plan.limitOverrides (overrides win).
     */
    async getEffectiveLimits(tenantId) {
        const plan = await this.planRepository.findByTenant(tenantId);
        if (!plan) {
            // Fallback to free tier defaults
            return {
                features: {},
                limits: {},
                tierKey: 'free',
            };
        }
        const pkg = await this.packageService.findOne(plan.packageId);
        return {
            tierKey: plan.tierKey,
            features: { ...pkg.features, ...plan.featureOverrides },
            limits: { ...pkg.limits, ...plan.limitOverrides },
        };
    }
    async remove(id, actorId) {
        await this.findOne(id);
        await this.planRepository.softDelete(id);
        await this.eventEmitter.emitAsync(plan_events_1.PlanEvents.DELETED, {
            planId: id, actorId, timestamp: new Date().toISOString(),
        });
    }
};
exports.PlanService = PlanService;
exports.PlanService = PlanService = PlanService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [plan_repository_1.PlanRepository,
        package_service_1.PackageService,
        event_emitter_1.EventEmitter2])
], PlanService);
//# sourceMappingURL=plan.service.js.map