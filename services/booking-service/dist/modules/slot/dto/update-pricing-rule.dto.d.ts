export declare const RULE_TYPES: readonly ["base", "peak", "weekend", "holiday", "member", "custom"];
export declare const MOD_TYPES: readonly ["percentage", "fixed", "absolute"];
export declare const SCOPES: readonly ["tenant", "branch", "sport", "court"];
export declare const DAYS_OF_WEEK: readonly ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
/**
 * All fields are optional — partial updates allowed.
 * When modifierType or modifierValue changes, validation re-runs
 * against ruleType semantics in PricingRuleValidationService.
 */
export declare class UpdatePricingRuleDto {
    name?: string;
    description?: string;
    ruleType?: typeof RULE_TYPES[number];
    modifierType?: typeof MOD_TYPES[number];
    /** For percentage: -100 to 10000. For fixed/absolute: 0 to 2_147_483_647 (int max) */
    modifierValue?: number;
    scope?: typeof SCOPES[number];
    branchId?: string | null;
    sportId?: string | null;
    courtId?: string | null;
    validFrom?: string | null;
    validUntil?: string | null;
    /** Empty array = applies all days. Null = applies all days. */
    daysOfWeek?: (typeof DAYS_OF_WEEK[number])[] | null;
    /** HH:MM 24-hour format */
    timeStart?: string | null;
    timeEnd?: string | null;
    priority?: number;
    isActive?: boolean;
}
//# sourceMappingURL=update-pricing-rule.dto.d.ts.map