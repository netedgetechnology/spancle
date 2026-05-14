import { EventEmitter2 } from '@nestjs/event-emitter';
import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { PricingRuleRepository } from '../repositories/pricing-rule.repository';
import { PricingService } from '../services/pricing.service';
import { PricingRuleValidationService } from '../services/pricing-rule-validation.service';
import { CreatePricingRuleDto } from '../dto/create-pricing-rule.dto';
import { UpdatePricingRuleDto } from '../dto/update-pricing-rule.dto';
import { PricingPreviewDto } from '../dto/pricing-preview.dto';
import type { PricingRuleEntity } from '../entities/pricing-rule.entity';
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
export declare class PricingRuleController {
    private readonly pricingRuleRepository;
    private readonly pricingService;
    private readonly validationService;
    private readonly eventEmitter;
    constructor(pricingRuleRepository: PricingRuleRepository, pricingService: PricingService, validationService: PricingRuleValidationService, eventEmitter: EventEmitter2);
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
    create(dto: CreatePricingRuleDto, tenant: TenantContext): Promise<{
        rule: PricingRuleEntity;
        warnings: import("../services/pricing-rule-validation.service").ConflictEntry[];
    }>;
    findAll(tenant: TenantContext, includeInactive?: string): Promise<PricingRuleEntity[]>;
    /**
     * GET /pricing-rules/preview
     *
     * Resolves the effective price for a hypothetical slot using the current
     * active rule set. No DB writes. Returns full breakdown and summary string.
     *
     * Declared before /:id to avoid route shadowing.
     */
    getPreview(dto: PricingPreviewDto, tenant: TenantContext): Promise<import("../dto/pricing-preview.dto").PricingPreviewResult>;
    findOne(id: string, tenant: TenantContext): Promise<PricingRuleEntity>;
    /**
     * PATCH /pricing-rules/:id
     *
     * Partial update. Validates the merged candidate (existing + patch) against
     * the full rule set before persisting.
     * Returns: { rule, warnings }
     */
    update(id: string, dto: UpdatePricingRuleDto, tenant: TenantContext): Promise<{
        rule: PricingRuleEntity;
        warnings: import("../services/pricing-rule-validation.service").ConflictEntry[];
    }>;
    /**
     * PATCH /pricing-rules/:id/activate
     * Activates a previously deactivated rule. Re-validates against active rules
     * because the rule set has changed since it was deactivated.
     */
    activate(id: string, tenant: TenantContext): Promise<{
        rule: PricingRuleEntity;
        warnings: import("../services/pricing-rule-validation.service").ConflictEntry[];
    }>;
    /**
     * PATCH /pricing-rules/:id/deactivate
     * Deactivates a rule without deleting it. The rule stops being applied
     * immediately (next generation / preview call will not find it).
     */
    deactivate(id: string, tenant: TenantContext): Promise<PricingRuleEntity>;
    /**
     * DELETE /pricing-rules/:id
     * Soft deletes (sets isDeleted = true, isActive = false).
     * The rule is excluded from all future resolution queries.
     * Audit trail is preserved — the row remains in the DB.
     */
    remove(id: string, tenant: TenantContext): Promise<void>;
    /**
     * Maps CreatePricingRuleDto → Partial<PricingRuleEntity> with defaults.
     * Explicit about every field so new DTO fields are never silently dropped.
     */
    private dtoToEntity;
    /**
     * Maps UpdatePricingRuleDto → Partial<PricingRuleEntity>.
     * Only includes keys that were explicitly present in the DTO (undefined = omitted).
     */
    private updateDtoToPartialEntity;
}
//# sourceMappingURL=pricing-rule.controller.d.ts.map