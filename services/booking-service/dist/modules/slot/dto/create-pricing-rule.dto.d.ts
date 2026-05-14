declare const RULE_TYPES: readonly ["base", "peak", "weekend", "holiday", "member", "custom"];
declare const MOD_TYPES: readonly ["percentage", "fixed", "absolute"];
declare const SCOPES: readonly ["tenant", "branch", "sport", "court"];
declare const DAYS_OF_WEEK: readonly ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
export declare class CreatePricingRuleDto {
    name: string;
    description?: string;
    ruleType: typeof RULE_TYPES[number];
    modifierType?: typeof MOD_TYPES[number];
    /** For percentage: 25 = +25%. For fixed/absolute: minor currency units */
    modifierValue: number;
    scope?: typeof SCOPES[number];
    branchId?: string;
    sportId?: string;
    courtId?: string;
    validFrom?: string;
    validUntil?: string;
    daysOfWeek?: (typeof DAYS_OF_WEEK[number])[];
    /** HH:MM — start of time window (null = all day) */
    timeStart?: string;
    timeEnd?: string;
    priority?: number;
}
export {};
//# sourceMappingURL=create-pricing-rule.dto.d.ts.map