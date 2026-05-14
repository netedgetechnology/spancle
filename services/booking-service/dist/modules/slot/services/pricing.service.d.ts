import { PricingRuleRepository } from '../repositories/pricing-rule.repository';
import { HolidayRepository } from '../repositories/holiday.repository';
import type { PricingPreviewDto, PricingPreviewResult } from '../dto/pricing-preview.dto';
export interface PriceResolutionResult {
    /** Final price in minor currency units. Null = free (no base + no rules). */
    resolvedPriceMinor: number | null;
    /** IDs of every rule that contributed — stored on the slot for audit */
    appliedRuleIds: string[];
    /** Step-by-step breakdown — for the preview endpoint and debugging */
    breakdown: PriceBreakdownStep[];
}
export interface PriceBreakdownStep {
    ruleId: string;
    ruleName: string;
    ruleType: string;
    modifierType: string;
    modifierValue: number;
    priceAfter: number;
}
export interface SlotPricingContext {
    tenantId: string;
    courtId: string;
    branchId: string;
    sportId: string | null;
    startAt: Date;
    durationMins: number;
    courtHourlyRateMinor: number | null;
    /** Whether the booker is a member — enables member-type rules */
    isMember: boolean;
    /** ISO-4217 currency for formatting (default: 'GBP') */
    currency?: string;
}
/**
 * PricingService — resolves the effective price for a slot.
 *
 * ── PIPELINE (executed in strict order) ──────────────────────────────────────
 *
 * Step 0 — PROPORTIONAL BASE
 *   Compute base = courtHourlyRateMinor × (durationMins / 60)
 *   Null if no court rate — rules must provide a BASE rule, else price = 0
 *
 * Step 1 — BASE RULES
 *   Rules of ruleType = 'base' matching scope/date/time are applied.
 *   Only the highest-priority BASE rule fires (others ignored).
 *   A BASE rule can use percentage, fixed, or absolute modifiers:
 *     percentage → adjusts the proportional base
 *     fixed      → adds a fixed amount to the proportional base
 *     absolute   → replaces the base entirely with a fixed price
 *
 * Step 2 — ABSOLUTE CUSTOM OVERRIDE
 *   A custom rule with modifierType = 'absolute' short-circuits the pipeline.
 *   The highest-priority absolute rule sets the final price — no further
 *   modifiers apply. Returns immediately.
 *
 * Step 3 — ADDITIVE MODIFIERS (applied in this type order)
 *   peak    → time-window surcharge (percentage or fixed)
 *   weekend → Saturday/Sunday surcharge (percentage or fixed)
 *   holiday → public holiday surcharge (percentage or fixed);
 *             only fires when the slot date is in the holiday calendar
 *   member  → member discount; only fires when isMember = true
 *   custom  → catch-all; percentage/fixed custom adjustments
 *
 *   Within each type, all matching rules are applied (they stack).
 *   Priority only matters for ordering within the same type.
 *
 * Step 4 — BOUNDS + ROUNDING
 *   floor at 0 (never negative)
 *   round to nearest integer (pence/cents)
 *
 * ── BATCH OPTIMISATION ───────────────────────────────────────────────────────
 *
 * resolveBatch() groups slots by (courtId, branchId, sportId) to minimise
 * DB queries. All holiday dates for the range are pre-fetched in one query.
 * Rule queries are still per-slot due to time-window filtering, but the
 * holiday pre-fetch eliminates the O(N) holiday queries.
 */
export declare class PricingService {
    private readonly pricingRuleRepository;
    private readonly holidayRepository;
    private readonly logger;
    constructor(pricingRuleRepository: PricingRuleRepository, holidayRepository: HolidayRepository);
    resolve(ctx: SlotPricingContext): Promise<PriceResolutionResult>;
    /**
     * Resolves prices for multiple slots efficiently.
     *
     * Optimisations:
     *   1. Holidays pre-fetched for the full date range in one query
     *   2. Slots processed in parallel per date+time (Promise.all on outer groups)
     *
     * Note: rule queries are still per-slot because different times within the
     * same day can match different time-window rules. Holiday pre-fetch alone
     * eliminates the most expensive repeated query.
     */
    resolveBatch(slots: SlotPricingContext[]): Promise<PriceResolutionResult[]>;
    /**
     * Resolves the price for a hypothetical slot without persisting anything.
     * Returns a richly formatted result including human-readable breakdown.
     *
     * Used by the /pricing-rules/preview endpoint.
     */
    preview(dto: PricingPreviewDto, tenantId: string): Promise<PricingPreviewResult>;
    private runPipeline;
    private computeProportionalBase;
    private applyModifier;
    private formatPrice;
    private enrichBreakdown;
    private buildSummary;
}
//# sourceMappingURL=pricing.service.d.ts.map