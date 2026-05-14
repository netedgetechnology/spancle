/**
 * Rule type determines how the modifier is applied in the price pipeline:
 *
 *   base      — replaces the base rate entirely (used for per-court custom rates)
 *   peak      — +% or +fixed added during peak hours
 *   weekend   — +% or +fixed added on Saturday/Sunday
 *   holiday   — +% or +fixed added on public holidays (matched via HolidayEntity)
 *   member    — -% discount applied for member bookings (negative modifierPct)
 *   custom    — fixed price override for a specific time window (ignores base)
 */
export type PricingRuleType = 'base' | 'peak' | 'weekend' | 'holiday' | 'member' | 'custom';
/**
 * Modifier types:
 *   percentage — modifierValue is a percentage (e.g. 25 = +25%)
 *   fixed      — modifierValue is an amount in minor currency units (e.g. 500 = £5.00)
 *   absolute   — modifierValue replaces the total price entirely
 */
export type ModifierType = 'percentage' | 'fixed' | 'absolute';
/**
 * Rule scope — defines what resource the rule applies to.
 * More specific scopes override less specific ones at the same priority.
 *
 *   tenant  → applies to all bookings for this tenant
 *   branch  → applies to all courts in a branch
 *   sport   → applies to all courts for a sport
 *   court   → applies to a specific court only
 */
export type PricingRuleScope = 'tenant' | 'branch' | 'sport' | 'court';
/**
 * PricingRuleEntity — a price modifier rule.
 *
 * Rules are evaluated by PricingService in a waterfall:
 *
 *   1. All rules matching scope, date, time, day-of-week are collected
 *   2. Sorted by priority DESC (higher = evaluated first)
 *   3. Applied in order by ruleType (base → peak/weekend/holiday → member)
 *   4. Custom rules with absolute modifierType set the final price directly
 *
 * A court's effective price =
 *   base_rate × (1 + Σ percentage modifiers) + Σ fixed modifiers
 *   rounded to nearest integer (pence)
 *
 * Table: pricing_rules
 */
export declare class PricingRuleEntity {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    ruleType: PricingRuleType;
    modifierType: ModifierType;
    /**
     * The modifier value:
     *   - percentage: 25 = +25%, -10 = -10%
     *   - fixed:      500 = +£5.00 in minor units
     *   - absolute:   3500 = price is exactly £35.00
     */
    modifierValue: number;
    scope: PricingRuleScope;
    /** Populated when scope = 'branch' */
    branchId: string | null;
    /** Populated when scope = 'sport' */
    sportId: string | null;
    /** Populated when scope = 'court' */
    courtId: string | null;
    /** Date from which this rule is active (inclusive, date only). Null = always. */
    validFrom: string | null;
    /** Date after which this rule expires (inclusive). Null = no end. */
    validUntil: string | null;
    /**
     * Which days of the week this rule applies to.
     * Empty array or null = applies to all days.
     * e.g. ['saturday', 'sunday'] for a weekend surcharge.
     */
    daysOfWeek: string[] | null;
    /**
     * Rule only applies during this time window.
     * HH:MM format. Null = applies all day.
     * e.g. peakStartTime='17:00' peakEndTime='21:00' for evening peak.
     */
    timeStart: string | null;
    timeEnd: string | null;
    /**
     * Priority for conflict resolution.
     * Higher value = evaluated first. When two rules of the same type
     * and scope overlap, the higher-priority rule wins.
     * Default 0 (base priority). Admins can set 1–100 for overrides.
     */
    priority: number;
    isActive: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=pricing-rule.entity.d.ts.map