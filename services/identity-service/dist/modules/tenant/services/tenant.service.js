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
var TenantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const types_1 = require("@spancle/types");
const tenant_repository_1 = require("../repositories/tenant.repository");
const tenant_entity_1 = require("../entities/tenant.entity");
const plan_limits_types_1 = require("../types/plan-limits.types");
/**
 * TenantService — tenant lifecycle management.
 *
 * Exposes:
 *   - CRUD operations for the superadmin portal
 *   - Resolution methods used by TenantResolverMiddleware
 *   - Plan limit resolution for TenantContextRuntime construction
 *   - Status transition methods with event emission
 */
let TenantService = TenantService_1 = class TenantService {
    constructor(tenantRepository, eventEmitter) {
        this.tenantRepository = tenantRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(TenantService_1.name);
    }
    // ── Resolution (called by TenantResolverMiddleware) ────────────────────────
    async findById(id) {
        return this.tenantRepository.findRawById(id);
    }
    async findBySlug(slug) {
        return this.tenantRepository.findBySlug(slug);
    }
    /**
     * Resolves plan limits for a given tier.
     * Falls back to 'free' limits if tier is unrecognised.
     * Sprint 3: allow per-tenant limit overrides stored in JSONB.
     */
    resolvePlanLimits(tier) {
        return plan_limits_types_1.DEFAULT_PLAN_LIMITS[tier] ?? plan_limits_types_1.DEFAULT_PLAN_LIMITS['free'];
    }
    // ── CRUD ───────────────────────────────────────────────────────────────────
    async create(dto) {
        // Slug uniqueness
        const slugTaken = await this.tenantRepository.isSlugTaken(dto.slug);
        if (slugTaken) {
            throw new common_1.ConflictException(`Tenant slug "${dto.slug}" is already taken`);
        }
        // Email uniqueness
        const emailTaken = await this.tenantRepository.findByEmail(dto.email);
        if (emailTaken) {
            throw new common_1.ConflictException(`A tenant with email "${dto.email}" already exists`);
        }
        // Merge provided settings with defaults
        const defaultSettings = types_1.TenantSettingsSchema.parse({});
        const mergedSettings = {
            ...defaultSettings,
            ...(dto.settings ?? {}),
        };
        const entity = await this.tenantRepository.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .save(this.tenantRepository.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .create({
            name: dto.name,
            slug: dto.slug.toLowerCase(),
            email: dto.email,
            phone: dto.phone ?? null,
            tier: dto.tier ?? 'trial',
            status: 'pending',
            settings: mergedSettings,
            isDeleted: false,
        }));
        await this.eventEmitter.emitAsync('spancle.tenant.created', {
            tenantId: entity.id,
            name: entity.name,
            slug: entity.slug,
            tier: entity.tier,
            ownerEmail: entity.email,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Tenant created: ${entity.id} (${entity.slug})`);
        return entity;
    }
    async findAll(page = 1, limit = 20, status, tier) {
        return this.tenantRepository.findAllTenants(page, limit, status, tier);
    }
    async getById(tenantId) {
        const tenant = await this.tenantRepository.findRawById(tenantId);
        if (!tenant)
            throw new common_1.NotFoundException(`Tenant ${tenantId} not found`);
        return tenant;
    }
    async update(tenantId, dto) {
        const tenant = await this.getById(tenantId);
        Object.assign(tenant, {
            ...(dto.name && { name: dto.name }),
            ...(dto.email && { email: dto.email }),
            ...(dto.phone !== undefined && { phone: dto.phone }),
            updatedAt: new Date(),
        });
        const updated = await this.tenantRepository.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .save(tenant);
        await this.eventEmitter.emitAsync('spancle.tenant.updated', {
            tenantId: updated.id,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async updateSettings(tenantId, settings) {
        const tenant = await this.getById(tenantId);
        const mergedSettings = types_1.TenantSettingsSchema.parse({
            ...tenant.settings,
            ...settings,
        });
        tenant.settings = mergedSettings;
        tenant.updatedAt = new Date();
        const updated = await this.tenantRepository.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .save(tenant);
        await this.eventEmitter.emitAsync('spancle.tenant.updated', {
            tenantId: updated.id,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    // ── Status transitions ─────────────────────────────────────────────────────
    async activate(tenantId, actorId) {
        return this.transitionStatus(tenantId, 'active', actorId, 'spancle.tenant.activated');
    }
    async suspend(tenantId, actorId, reason) {
        const tenant = await this.transitionStatus(tenantId, 'suspended', actorId, 'spancle.tenant.suspended');
        this.logger.warn(`Tenant suspended: ${tenantId} by: ${actorId} reason: ${reason}`);
        return tenant;
    }
    async terminate(tenantId, actorId, reason) {
        const tenant = await this.transitionStatus(tenantId, 'terminated', actorId, 'spancle.tenant.terminated');
        this.logger.warn(`Tenant terminated: ${tenantId} by: ${actorId} reason: ${reason}`);
        return tenant;
    }
    async changeTier(tenantId, newTier, actorId) {
        const tenant = await this.getById(tenantId);
        const oldTier = tenant.tier;
        await this.tenantRepository.updateTier(tenantId, newTier);
        const updated = await this.getById(tenantId);
        await this.eventEmitter.emitAsync('spancle.tenant.tier_changed', {
            tenantId,
            previousTier: oldTier,
            newTier,
            actorId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Tenant ${tenantId} tier changed: ${oldTier} → ${newTier} by ${actorId}`);
        return updated;
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    async transitionStatus(tenantId, newStatus, actorId, eventName) {
        await this.getById(tenantId); // validate existence
        await this.tenantRepository.updateStatus(tenantId, newStatus);
        const updated = await this.getById(tenantId);
        await this.eventEmitter.emitAsync(eventName, {
            tenantId,
            newStatus,
            actorId,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = TenantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_repository_1.TenantRepository,
        event_emitter_1.EventEmitter2])
], TenantService);
//# sourceMappingURL=tenant.service.js.map