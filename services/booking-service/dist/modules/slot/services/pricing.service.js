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
var PricingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const pricing_rule_repository_1 = require("../repositories/pricing-rule.repository");
const holiday_repository_1 = require("../repositories/holiday.repository");
const slot_utils_1 = require("../utils/slot.utils");
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
let PricingService = PricingService_1 = class PricingService {
    constructor(pricingRuleRepository, holidayRepository) {
        this.pricingRuleRepository = pricingRuleRepository;
        this.holidayRepository = holidayRepository;
        this.logger = new common_1.Logger(PricingService_1.name);
    }
    // ── Single slot resolution ─────────────────────────────────────────────────
    async resolve(ctx) {
        const slotDate = ctx.startAt.toISOString().slice(0, 10);
        const slotTime = ctx.startAt.toISOString().slice(11, 16);
        const dayOfWeek = slot_utils_1.SlotUtils.getDayOfWeek(ctx.startAt);
        const [matchingRules, isHoliday] = await Promise.all([
            this.pricingRuleRepository.findMatchingRules({
                tenantId: ctx.tenantId,
                courtId: ctx.courtId,
                branchId: ctx.branchId,
                sportId: ctx.sportId,
                slotDate,
                slotTime,
                dayOfWeek,
            }),
            this.holidayRepository.isHoliday(ctx.tenantId, slotDate),
        ]);
        const proportionalBase = this.computeProportionalBase(ctx.courtHourlyRateMinor, ctx.durationMins);
        return this.runPipeline(matchingRules, proportionalBase, isHoliday, ctx.isMember);
    }
    // ── Batch resolution (used by SlotGeneratorService) ───────────────────────
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
    async resolveBatch(slots) {
        if (slots.length === 0)
            return [];
        // Pre-fetch holidays for the full range
        const dates = slots.map((s) => s.startAt.toISOString().slice(0, 10)).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const tenantId = slots[0].tenantId;
        const holidayDates = await this.holidayRepository.getHolidayDatesInRange(tenantId, startDate, endDate);
        // Resolve all slots in parallel
        return Promise.all(slots.map(async (ctx) => {
            const slotDate = ctx.startAt.toISOString().slice(0, 10);
            const slotTime = ctx.startAt.toISOString().slice(11, 16);
            const dayOfWeek = slot_utils_1.SlotUtils.getDayOfWeek(ctx.startAt);
            const isHoliday = holidayDates.has(slotDate);
            const matchingRules = await this.pricingRuleRepository.findMatchingRules({
                tenantId: ctx.tenantId,
                courtId: ctx.courtId,
                branchId: ctx.branchId,
                sportId: ctx.sportId,
                slotDate,
                slotTime,
                dayOfWeek,
            });
            const proportionalBase = this.computeProportionalBase(ctx.courtHourlyRateMinor, ctx.durationMins);
            return this.runPipeline(matchingRules, proportionalBase, isHoliday, ctx.isMember);
        }));
    }
    // ── Preview (admin tool — hypothetical resolution) ─────────────────────────
    /**
     * Resolves the price for a hypothetical slot without persisting anything.
     * Returns a richly formatted result including human-readable breakdown.
     *
     * Used by the /pricing-rules/preview endpoint.
     */
    async preview(dto, tenantId) {
        const startAt = new Date(dto.startAt);
        const slotDate = startAt.toISOString().slice(0, 10);
        const slotTime = startAt.toISOString().slice(11, 16);
        const dayOfWeek = slot_utils_1.SlotUtils.getDayOfWeek(startAt);
        const isWeekend = slot_utils_1.SlotUtils.isWeekend(startAt);
        const currency = dto.currency ?? 'GBP';
        const [matchingRules, isHoliday] = await Promise.all([
            this.pricingRuleRepository.findMatchingRules({
                tenantId,
                courtId: dto.courtId,
                branchId: dto.branchId,
                sportId: dto.sportId ?? null,
                slotDate,
                slotTime,
                dayOfWeek,
            }),
            this.holidayRepository.isHoliday(tenantId, slotDate),
        ]);
        const proportionalBase = this.computeProportionalBase(dto.courtHourlyRateMinor ?? null, dto.durationMins);
        const result = this.runPipeline(matchingRules, proportionalBase, isHoliday, dto.isMember ?? false);
        return {
            resolvedPriceMinor: result.resolvedPriceMinor,
            formattedPrice: this.formatPrice(result.resolvedPriceMinor, currency),
            isHoliday,
            isWeekend,
            breakdown: this.enrichBreakdown(result.breakdown, currency),
            appliedRuleIds: result.appliedRuleIds,
            summary: this.buildSummary(result.breakdown, proportionalBase, currency),
        };
    }
    // ── Core pipeline ─────────────────────────────────────────────────────────
    runPipeline(rules, proportionalBase, isHoliday, isMember) {
        const appliedRuleIds = [];
        const breakdown = [];
        let currentPrice = proportionalBase ?? 0;
        const push = (rule, after) => {
            appliedRuleIds.push(rule.id);
            breakdown.push({
                ruleId: rule.id,
                ruleName: rule.name,
                ruleType: rule.ruleType,
                modifierType: rule.modifierType,
                modifierValue: rule.modifierValue,
                priceAfter: Math.max(0, Math.round(after)),
            });
            currentPrice = after;
        };
        // ── Step 1: BASE rules ──────────────────────────────────────────────────
        // Only the single highest-priority BASE rule fires.
        const baseRules = rules
            .filter((r) => r.ruleType === 'base')
            .sort((a, b) => b.priority - a.priority);
        if (baseRules.length > 0) {
            const rule = baseRules[0];
            const after = this.applyModifier(currentPrice, rule);
            push(rule, after);
        }
        // ── Step 2: ABSOLUTE custom override — short-circuit ───────────────────
        const absoluteRules = rules
            .filter((r) => r.ruleType === 'custom' && r.modifierType === 'absolute')
            .sort((a, b) => b.priority - a.priority);
        if (absoluteRules.length > 0) {
            const rule = absoluteRules[0];
            const after = rule.modifierValue; // absolute: set price directly
            push(rule, after);
            return {
                resolvedPriceMinor: Math.max(0, Math.round(currentPrice)),
                appliedRuleIds,
                breakdown,
            };
        }
        // ── Step 3: Additive modifiers ─────────────────────────────────────────
        // Applied in this exact type order; all matching rules within each type stack.
        const modifierOrder = ['peak', 'weekend', 'holiday', 'member', 'custom'];
        for (const ruleType of modifierOrder) {
            const candidates = rules
                .filter((r) => {
                if (r.ruleType !== ruleType)
                    return false;
                // holiday rules: only fire on actual holidays
                if (ruleType === 'holiday' && !isHoliday)
                    return false;
                // member rules: only fire when booker is a member
                if (ruleType === 'member' && !isMember)
                    return false;
                return true;
            })
                .sort((a, b) => b.priority - a.priority); // highest priority first within type
            for (const rule of candidates) {
                const after = this.applyModifier(currentPrice, rule);
                push(rule, after);
            }
        }
        // ── Step 4: Bounds + rounding ──────────────────────────────────────────
        const final = Math.max(0, Math.round(currentPrice));
        return {
            resolvedPriceMinor: proportionalBase === null && appliedRuleIds.length === 0
                ? null // genuinely free — no base rate and no rules applied
                : final,
            appliedRuleIds,
            breakdown,
        };
    }
    // ── Helpers ───────────────────────────────────────────────────────────────
    computeProportionalBase(hourlyRateMinor, durationMins) {
        if (hourlyRateMinor == null)
            return null;
        return Math.round(hourlyRateMinor * (durationMins / 60));
    }
    applyModifier(base, rule) {
        switch (rule.modifierType) {
            case 'percentage':
                return base * (1 + rule.modifierValue / 100);
            case 'fixed':
                return base + rule.modifierValue;
            case 'absolute':
                return rule.modifierValue;
            default:
                return base;
        }
    }
    formatPrice(minorUnits, currency) {
        if (minorUnits == null)
            return 'Free';
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(minorUnits / 100);
    }
    enrichBreakdown(steps, currency) {
        return steps.map((step, i) => {
            let formattedEffect;
            const prev = i === 0 ? 0 : steps[i - 1].priceAfter;
            const diff = step.priceAfter - prev;
            if (step.modifierType === 'absolute') {
                formattedEffect = `= ${this.formatPrice(step.priceAfter, currency)}`;
            }
            else if (step.modifierType === 'percentage') {
                const sign = step.modifierValue >= 0 ? '+' : '';
                formattedEffect = `${sign}${step.modifierValue}%`;
            }
            else {
                // fixed
                const sign = diff >= 0 ? '+' : '';
                formattedEffect = `${sign}${this.formatPrice(Math.abs(diff), currency)}`;
            }
            return {
                ruleId: step.ruleId,
                ruleName: step.ruleName,
                ruleType: step.ruleType,
                modifierType: step.modifierType,
                modifierValue: step.modifierValue,
                priceAfter: step.priceAfter,
                formattedEffect,
            };
        });
    }
    buildSummary(breakdown, proportionalBase, currency) {
        if (breakdown.length === 0) {
            return proportionalBase != null
                ? `Base rate ${this.formatPrice(proportionalBase, currency)}, no pricing rules applied`
                : 'Free — no base rate or pricing rules';
        }
        const parts = [];
        if (proportionalBase != null) {
            parts.push(`Base ${this.formatPrice(proportionalBase, currency)}`);
        }
        for (const step of breakdown) {
            if (step.modifierType === 'absolute') {
                parts.push(`${step.ruleName} → ${this.formatPrice(step.priceAfter, currency)}`);
            }
            else if (step.modifierType === 'percentage') {
                const sign = step.modifierValue >= 0 ? '+' : '';
                parts.push(`${step.ruleName} (${sign}${step.modifierValue}%)`);
            }
            else {
                const diff = step.priceAfter - (parts.length === 0 ? 0 : breakdown[breakdown.indexOf(step) - 1]?.priceAfter ?? 0);
                const sign = diff >= 0 ? '+' : '-';
                parts.push(`${step.ruleName} (${sign}${this.formatPrice(Math.abs(diff), currency)})`);
            }
        }
        const final = breakdown[breakdown.length - 1].priceAfter;
        return `${parts.join(' → ')} = ${this.formatPrice(final, currency)}`;
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = PricingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pricing_rule_repository_1.PricingRuleRepository,
        holiday_repository_1.HolidayRepository])
], PricingService);
//# sourceMappingURL=pricing.service.js.map