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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRuleController = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const slot_guard_1 = require("../guards/slot.guard");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const pricing_rule_repository_1 = require("../repositories/pricing-rule.repository");
const pricing_service_1 = require("../services/pricing.service");
const pricing_rule_validation_service_1 = require("../services/pricing-rule-validation.service");
const create_pricing_rule_dto_1 = require("../dto/create-pricing-rule.dto");
const update_pricing_rule_dto_1 = require("../dto/update-pricing-rule.dto");
const pricing_preview_dto_1 = require("../dto/pricing-preview.dto");
/**
 * PricingRuleController — full pricing rule lifecycle.
 *
 * All routes protected by TenantGuard (tenantId extracted from JWT) and
 * AuditInterceptor (request logged for compliance).
 *
 * Routes:
 *   POST   /api/v1/pricing-rules              create with validation
 *   GET    /api/v1/pricing-rules              list (all active; opt-in include inactive)
 *   GET    /api/v1/pricing-rules/preview      preview price for a hypothetical slot
 *   GET    /api/v1/pricing-rules/:id          single rule
 *   PATCH  /api/v1/pricing-rules/:id          update with validation
 *   PATCH  /api/v1/pricing-rules/:id/activate toggle isActive = true
 *   PATCH  /api/v1/pricing-rules/:id/deactivate toggle isActive = false
 *   DELETE /api/v1/pricing-rules/:id          soft delete
 *
 * Design decisions:
 *
 *   - All mutations go through PricingRuleValidationService before
 *     touching the DB. Validation throws on hard errors (400/422) and
 *     returns warnings in the response body for soft conflicts.
 *
 *   - Events are emitted after every successful mutation so the reporting
 *     service can track rule changes and their effect on revenue.
 *
 *   - Preview is a GET with a query-string body (PricingPreviewDto) rather
 *     than POST because it has no side effects and should be cacheable.
 *     In practice the admin UI sends it on every form change.
 */
let PricingRuleController = class PricingRuleController {
    constructor(pricingRuleRepository, pricingService, validationService, eventEmitter) {
        this.pricingRuleRepository = pricingRuleRepository;
        this.pricingService = pricingService;
        this.validationService = validationService;
        this.eventEmitter = eventEmitter;
    }
    // ── Create ─────────────────────────────────────────────────────────────────
    /**
     * POST /pricing-rules
     *
     * Creates a new pricing rule after running full validation:
     *   1. Semantic check  — ruleType + modifierType compatibility
     *   2. Value ranges    — percentage bounds, time ordering, date ordering
     *   3. Scope FK check  — branchId/sportId/courtId present when required
     *   4. Conflict scan   — no overlapping BASE or ABSOLUTE rules for same scope
     *
     * Returns: { rule, warnings } — warnings are non-fatal conflict advisories.
     */
    async create(dto, tenant) {
        const candidate = this.dtoToEntity(dto, tenant.tenantId);
        // Run validation — throws BadRequestException / UnprocessableEntityException on errors
        const report = await this.validationService.validate(candidate, tenant.tenantId);
        const rule = await this.pricingRuleRepository.create(candidate);
        await this.eventEmitter.emitAsync('spancle.pricing_rule.created', {
            tenantId: tenant.tenantId,
            ruleId: rule.id,
            ruleType: rule.ruleType,
            scope: rule.scope,
            timestamp: new Date().toISOString(),
        });
        return { rule, warnings: report.warnings };
    }
    // ── Read ───────────────────────────────────────────────────────────────────
    findAll(tenant, includeInactive) {
        return this.pricingRuleRepository.findAll(tenant.tenantId, includeInactive === 'true');
    }
    /**
     * GET /pricing-rules/preview
     *
     * Resolves the effective price for a hypothetical slot using the current
     * active rule set. No DB writes. Returns full breakdown and summary string.
     *
     * Declared before /:id to avoid route shadowing.
     */
    getPreview(dto, tenant) {
        return this.pricingService.preview(dto, tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);
    }
    // ── Update ─────────────────────────────────────────────────────────────────
    /**
     * PATCH /pricing-rules/:id
     *
     * Partial update. Validates the merged candidate (existing + patch) against
     * the full rule set before persisting.
     * Returns: { rule, warnings }
     */
    async update(id, dto, tenant) {
        // Fetch existing so we can merge before validation
        const existing = await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);
        // Merge patch onto existing for a complete validation candidate
        const merged = {
            ...existing,
            ...this.updateDtoToPartialEntity(dto),
        };
        // Validate merged state — pass excludeId to skip self-conflict
        const report = await this.validationService.validate(merged, tenant.tenantId, id);
        const rule = await this.pricingRuleRepository.updateById(id, tenant.tenantId, this.updateDtoToPartialEntity(dto));
        await this.eventEmitter.emitAsync('spancle.pricing_rule.updated', {
            tenantId: tenant.tenantId,
            ruleId: id,
            ruleType: rule.ruleType,
            timestamp: new Date().toISOString(),
        });
        return { rule, warnings: report.warnings };
    }
    /**
     * PATCH /pricing-rules/:id/activate
     * Activates a previously deactivated rule. Re-validates against active rules
     * because the rule set has changed since it was deactivated.
     */
    async activate(id, tenant) {
        const existing = await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);
        // Re-validate now that this rule is rejoining the active set
        const report = await this.validationService.validate({ ...existing, isActive: true }, tenant.tenantId, id);
        const rule = await this.pricingRuleRepository.updateById(id, tenant.tenantId, { isActive: true });
        await this.eventEmitter.emitAsync('spancle.pricing_rule.activated', {
            tenantId: tenant.tenantId, ruleId: id, timestamp: new Date().toISOString(),
        });
        return { rule, warnings: report.warnings };
    }
    /**
     * PATCH /pricing-rules/:id/deactivate
     * Deactivates a rule without deleting it. The rule stops being applied
     * immediately (next generation / preview call will not find it).
     */
    async deactivate(id, tenant) {
        await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);
        const rule = await this.pricingRuleRepository.updateById(id, tenant.tenantId, { isActive: false });
        await this.eventEmitter.emitAsync('spancle.pricing_rule.deactivated', {
            tenantId: tenant.tenantId, ruleId: id, timestamp: new Date().toISOString(),
        });
        return rule;
    }
    // ── Delete ─────────────────────────────────────────────────────────────────
    /**
     * DELETE /pricing-rules/:id
     * Soft deletes (sets isDeleted = true, isActive = false).
     * The rule is excluded from all future resolution queries.
     * Audit trail is preserved — the row remains in the DB.
     */
    async remove(id, tenant) {
        await this.pricingRuleRepository.findByIdOrFail(id, tenant.tenantId);
        await this.pricingRuleRepository.softDelete(id, tenant.tenantId);
        await this.eventEmitter.emitAsync('spancle.pricing_rule.deleted', {
            tenantId: tenant.tenantId, ruleId: id, timestamp: new Date().toISOString(),
        });
    }
    // ── Private helpers ────────────────────────────────────────────────────────
    /**
     * Maps CreatePricingRuleDto → Partial<PricingRuleEntity> with defaults.
     * Explicit about every field so new DTO fields are never silently dropped.
     */
    dtoToEntity(dto, tenantId) {
        return {
            tenantId,
            name: dto.name,
            description: dto.description ?? null,
            ruleType: dto.ruleType,
            modifierType: dto.modifierType ?? 'percentage',
            modifierValue: dto.modifierValue,
            scope: dto.scope ?? 'tenant',
            branchId: dto.branchId ?? null,
            sportId: dto.sportId ?? null,
            courtId: dto.courtId ?? null,
            validFrom: dto.validFrom ?? null,
            validUntil: dto.validUntil ?? null,
            daysOfWeek: dto.daysOfWeek ?? null,
            timeStart: dto.timeStart ?? null,
            timeEnd: dto.timeEnd ?? null,
            priority: dto.priority ?? 0,
            isActive: true,
            isDeleted: false,
        };
    }
    /**
     * Maps UpdatePricingRuleDto → Partial<PricingRuleEntity>.
     * Only includes keys that were explicitly present in the DTO (undefined = omitted).
     */
    updateDtoToPartialEntity(dto) {
        const patch = {};
        if (dto.name !== undefined)
            patch.name = dto.name;
        if (dto.description !== undefined)
            patch.description = dto.description ?? null;
        if (dto.ruleType !== undefined)
            patch.ruleType = dto.ruleType;
        if (dto.modifierType !== undefined)
            patch.modifierType = dto.modifierType;
        if (dto.modifierValue !== undefined)
            patch.modifierValue = dto.modifierValue;
        if (dto.scope !== undefined)
            patch.scope = dto.scope;
        if (dto.branchId !== undefined)
            patch.branchId = dto.branchId ?? null;
        if (dto.sportId !== undefined)
            patch.sportId = dto.sportId ?? null;
        if (dto.courtId !== undefined)
            patch.courtId = dto.courtId ?? null;
        if (dto.validFrom !== undefined)
            patch.validFrom = dto.validFrom ?? null;
        if (dto.validUntil !== undefined)
            patch.validUntil = dto.validUntil ?? null;
        if (dto.daysOfWeek !== undefined)
            patch.daysOfWeek = dto.daysOfWeek ?? null;
        if (dto.timeStart !== undefined)
            patch.timeStart = dto.timeStart ?? null;
        if (dto.timeEnd !== undefined)
            patch.timeEnd = dto.timeEnd ?? null;
        if (dto.priority !== undefined)
            patch.priority = dto.priority;
        if (dto.isActive !== undefined)
            patch.isActive = dto.isActive;
        return patch;
    }
};
exports.PricingRuleController = PricingRuleController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pricing_rule_dto_1.CreatePricingRuleDto, Object]),
    __metadata("design:returntype", Promise)
], PricingRuleController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('includeInactive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PricingRuleController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('preview'),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [pricing_preview_dto_1.PricingPreviewDto, Object]),
    __metadata("design:returntype", void 0)
], PricingRuleController.prototype, "getPreview", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], PricingRuleController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_pricing_rule_dto_1.UpdatePricingRuleDto, Object]),
    __metadata("design:returntype", Promise)
], PricingRuleController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/activate'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PricingRuleController.prototype, "activate", null);
__decorate([
    (0, common_1.Patch)(':id/deactivate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PricingRuleController.prototype, "deactivate", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PricingRuleController.prototype, "remove", null);
exports.PricingRuleController = PricingRuleController = __decorate([
    (0, common_1.Controller)('pricing-rules'),
    (0, common_1.UseGuards)(slot_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [pricing_rule_repository_1.PricingRuleRepository,
        pricing_service_1.PricingService,
        pricing_rule_validation_service_1.PricingRuleValidationService,
        event_emitter_1.EventEmitter2])
], PricingRuleController);
//# sourceMappingURL=pricing-rule.controller.js.map