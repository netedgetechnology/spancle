/**
 * PricingPreviewDto — resolves the effective price for a hypothetical slot
 * without creating any DB records.
 *
 * Used by the admin UI to show "what price would this slot be?" before
 * generating slots or while configuring pricing rules.
 *
 * All fields except courtId and startAt are optional with sensible defaults.
 */
export declare class PricingPreviewDto {
    /** The court to price for (determines scope for rule matching) */
    courtId: string;
    /** Branch the court belongs to */
    branchId: string;
    /** Optional sport — used for sport-scoped rule matching */
    sportId?: string;
    /**
     * ISO-8601 datetime string for the hypothetical slot start.
     * Used to determine: date, time-of-day, day-of-week, holiday status.
     * e.g. "2025-06-21T09:00:00.000Z"
     */
    startAt: string;
    /**
     * Slot duration in minutes.
     * Used to compute the proportional base rate (hourlyRate × duration/60).
     */
    durationMins: number;
    /**
     * The court's hourly rate in minor currency units.
     * Pass the court's actual hourlyRateMinor from the court record.
     * Null = no base rate (pricing rules must supply a base, or price = 0).
     */
    courtHourlyRateMinor?: number | null;
    /**
     * Whether the hypothetical booker is a member.
     * When true, member-type pricing rules are included in the pipeline.
     * Default: false.
     */
    isMember?: boolean;
    /**
     * ISO-4217 currency code for display formatting in the response.
     * Default: 'GBP'.
     */
    currency?: string;
}
/**
 * PricingPreviewResult — response shape from the preview endpoint.
 * Includes the final price AND the full audit breakdown.
 */
export interface PricingPreviewResult {
    /** Final effective price in minor units. Null = free (no base + no rules). */
    resolvedPriceMinor: number | null;
    /** Formatted price string for display — e.g. "£35.00" */
    formattedPrice: string;
    /** Whether a holiday was active on the preview date */
    isHoliday: boolean;
    /** Whether weekend pricing applied */
    isWeekend: boolean;
    /** Step-by-step breakdown of which rules fired and in what order */
    breakdown: PricingBreakdownItem[];
    /** IDs of rules that contributed — for cross-referencing with the rule list */
    appliedRuleIds: string[];
    /** Human-readable summary — e.g. "Base £60 + Peak 25% = £75" */
    summary: string;
}
export interface PricingBreakdownItem {
    ruleId: string;
    ruleName: string;
    ruleType: string;
    modifierType: string;
    modifierValue: number;
    /** Price after this rule was applied */
    priceAfter: number;
    /** Formatted — e.g. "+£5.00" or "+25%" or "= £35.00" */
    formattedEffect: string;
}
//# sourceMappingURL=pricing-preview.dto.d.ts.map