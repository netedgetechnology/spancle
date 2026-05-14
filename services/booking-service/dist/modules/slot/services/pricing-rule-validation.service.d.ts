import { PricingRuleRepository } from '../repositories/pricing-rule.repository';
import type { PricingRuleEntity } from '../entities/pricing-rule.entity';
export interface ConflictReport {
    /** True if any ERROR-level conflicts — operation should be rejected */
    hasErrors: boolean;
    /** True if any WARNING-level conflicts — operation allowed but caller is warned */
    hasWarnings: boolean;
    errors: ConflictEntry[];
    warnings: ConflictEntry[];
}
export interface ConflictEntry {
    level: 'error' | 'warning';
    code: ConflictCode;
    message: string;
    conflictingRuleId?: string;
    conflictingRuleName?: string;
}
export type ConflictCode = 'DUPLICATE_BASE_RULE' | 'DUPLICATE_ABSOLUTE_OVERRIDE' | 'PRIORITY_COLLISION' | 'INVALID_PERCENTAGE_RANGE' | 'INVALID_TIME_WINDOW' | 'INVALID_DATE_RANGE' | 'SCOPE_FK_MISMATCH' | 'SEMANTIC_MISMATCH' | 'MEMBER_RULE_ABSOLUTE';
/**
 * PricingRuleValidationService — validates pricing rules before persistence.
 *
 * Runs on CREATE and UPDATE. Surfaces:
 *   - Hard errors   → operation rejected (400 / 422)
 *   - Soft warnings → operation allowed, warnings returned in response
 *
 * Validation categories:
 *   1. Semantic validation    — ruleType / modifierType compatibility
 *   2. Value range validation — percentage bounds, date ordering, time ordering
 *   3. Scope consistency     — scope enum matches the FK provided
 *   4. Conflict detection    — checks against existing active rules for this tenant
 */
export declare class PricingRuleValidationService {
    private readonly pricingRuleRepository;
    private readonly logger;
    constructor(pricingRuleRepository: PricingRuleRepository);
    /**
     * Full validation pass for a pricing rule.
     * Throws BadRequestException on any ERROR-level finding.
     * Returns ConflictReport containing warnings (non-fatal).
     *
     * @param candidate  The rule data to validate (may be partial for updates)
     * @param tenantId   Tenant context
     * @param excludeId  ID to exclude from conflict queries (for updates)
     */
    validate(candidate: Partial<PricingRuleEntity>, tenantId: string, excludeId?: string): Promise<ConflictReport>;
    private validateSemantics;
    private validateValueRanges;
    private validateScopeConsistency;
    private validateTimeWindow;
    private validateDateRange;
    private detectConflicts;
    /**
     * Returns true if the two rules could apply to the same slot
     * based on their scope and scope FKs.
     */
    private scopesCouldOverlap;
    /** Returns true if the two date ranges overlap (open-ended = infinite). */
    private dateRangesOverlap;
    /** Returns true if the two time windows overlap (null = all day). */
    private timeWindowsOverlap;
    /** Returns true if the two day-of-week sets share any day. */
    private daysOfWeekOverlap;
}
//# sourceMappingURL=pricing-rule-validation.service.d.ts.map