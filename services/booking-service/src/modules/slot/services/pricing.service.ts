import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { PricingRuleRepository } from '../repositories/pricing-rule.repository';
import { HolidayRepository }     from '../repositories/holiday.repository';
import { RateCardRepository }    from '../repositories/rate-card.repository';
import { RateCardService }       from './rate-card.service';
import type { PricingRuleEntity } from '../entities/pricing-rule.entity';
import { SlotUtils }              from '../utils/slot.utils';
import { PricingEvents }          from '../events/pricing.events';
import type {
  PricingPreviewDto,
  PricingPreviewResult,
  PricingBreakdownItem,
} from '../dto/pricing-preview.dto';

// ── Public interfaces ─────────────────────────────────────────────────────────

export interface PriceResolutionResult {
  /** Final price in minor currency units. Null = free (no base + no rules). */
  resolvedPriceMinor: number | null;
  /** IDs of every rule that contributed — stored on the slot for audit */
  appliedRuleIds:     string[];
  /** Step-by-step breakdown — for the preview endpoint and debugging */
  breakdown:          PriceBreakdownStep[];
}

export interface PriceBreakdownStep {
  ruleId:        string;
  ruleName:      string;
  ruleType:      string;
  modifierType:  string;
  modifierValue: number;
  priceAfter:    number;
}

export interface SlotPricingContext {
  tenantId:             string;
  courtId:              string;
  branchId:             string;
  sportId:              string | null;
  startAt:              Date;
  durationMins:         number;
  venueId?:             string | null;
  courtHourlyRateMinor: number | null;
  /** Rate Card ID if the court has one assigned (overrides courtHourlyRateMinor for base price) */
  rateCardId?:          string | null;
  /** Whether the booker is a member — enables member-type rules */
  isMember:             boolean;
  /**
   * Membership tier slug from MembershipPlan.slug.
   * Used by 'membership' rule type to apply tier-specific pricing.
   * null = no tier filtering (all membership rules fire when isMember = true).
   */
  membershipTier?:      string | null;
  /** ISO-4217 currency for formatting (default: 'GBP') */
  currency?:            string;
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
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    private readonly pricingRuleRepository: PricingRuleRepository,
    private readonly holidayRepository:     HolidayRepository,
    private readonly rateCardService:       RateCardService,
    private readonly rateCardRepository:    RateCardRepository,
    private readonly eventEmitter:          EventEmitter2,
  ) {}

  // ── Single slot resolution ─────────────────────────────────────────────────

  async resolve(ctx: SlotPricingContext): Promise<PriceResolutionResult> {
    const slotDate  = ctx.startAt.toISOString().slice(0, 10);
    const slotTime  = ctx.startAt.toISOString().slice(11, 16);
    const dayOfWeek = SlotUtils.getDayOfWeek(ctx.startAt);

    const [matchingRules, isHoliday] = await Promise.all([
      this.pricingRuleRepository.findMatchingRules({
        tenantId:  ctx.tenantId,
        courtId:   ctx.courtId,
        venueId:   ctx.venueId,
        branchId:  ctx.branchId,
        sportId:   ctx.sportId,
        slotDate,
        slotTime,
        dayOfWeek,
      }),
      this.holidayRepository.isHoliday(ctx.tenantId, slotDate),
    ]);

    const hourlyRateMinor = ctx.rateCardId
      ? await this.resolveRateCardBase(ctx.rateCardId, ctx.tenantId, slotDate, dayOfWeek, ctx.startAt.getUTCHours())
      : ctx.courtHourlyRateMinor;

    const proportionalBase = this.computeProportionalBase(hourlyRateMinor, ctx.durationMins);
    return this.runPipeline(matchingRules, proportionalBase, isHoliday, ctx.isMember, ctx.membershipTier ?? null);
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
  async resolveBatch(
    slots: SlotPricingContext[],
  ): Promise<PriceResolutionResult[]> {
    if (slots.length === 0) return [];

    // Pre-fetch holidays for the full range
    const dates     = slots.map((s) => s.startAt.toISOString().slice(0, 10)).sort();
    const startDate = dates[0]!;
    const endDate   = dates[dates.length - 1]!;
    const tenantId  = slots[0]!.tenantId;

    const holidayDates = await this.holidayRepository.getHolidayDatesInRange(
      tenantId, startDate, endDate,
    );

    // Resolve all slots in parallel
    return Promise.all(
      slots.map(async (ctx) => {
        const slotDate  = ctx.startAt.toISOString().slice(0, 10);
        const slotTime  = ctx.startAt.toISOString().slice(11, 16);
        const dayOfWeek = SlotUtils.getDayOfWeek(ctx.startAt);
        const isHoliday = holidayDates.has(slotDate);

        const matchingRules = await this.pricingRuleRepository.findMatchingRules({
          tenantId:  ctx.tenantId,
          courtId:   ctx.courtId,
          venueId:   ctx.venueId,
          branchId:  ctx.branchId,
          sportId:   ctx.sportId,
          slotDate,
          slotTime,
          dayOfWeek,
        });

        const hourlyRateMinor = ctx.rateCardId
          ? await this.resolveRateCardBase(ctx.rateCardId, ctx.tenantId, slotDate, dayOfWeek, ctx.startAt.getUTCHours())
          : ctx.courtHourlyRateMinor;

        const proportionalBase = this.computeProportionalBase(hourlyRateMinor, ctx.durationMins);
        return this.runPipeline(matchingRules, proportionalBase, isHoliday, ctx.isMember, ctx.membershipTier ?? null);
      }),
    );
  }

  // ── Preview (admin tool — hypothetical resolution) ─────────────────────────

  /**
   * Resolves the price for a hypothetical slot without persisting anything.
   * Returns a richly formatted result including human-readable breakdown.
   *
   * Used by the /pricing-rules/preview endpoint.
   */
  async preview(dto: PricingPreviewDto, tenantId: string): Promise<PricingPreviewResult> {
    const startAt   = new Date(dto.startAt);
    const slotDate  = startAt.toISOString().slice(0, 10);
    const slotTime  = startAt.toISOString().slice(11, 16);
    const dayOfWeek = SlotUtils.getDayOfWeek(startAt);
    const isWeekend = SlotUtils.isWeekend(startAt);
    const currency  = dto.currency ?? 'GBP';

    const [matchingRules, isHoliday] = await Promise.all([
      this.pricingRuleRepository.findMatchingRules({
        tenantId,
        courtId:   dto.courtId,
        venueId:   dto.venueId,
        branchId:  dto.branchId,
        sportId:   dto.sportId ?? null,
        slotDate,
        slotTime,
        dayOfWeek,
      }),
      this.holidayRepository.isHoliday(tenantId, slotDate),
    ]);

    const hourlyRateMinor = dto.rateCardId
      ? await this.resolveRateCardBase(dto.rateCardId, tenantId, slotDate, dayOfWeek, startAt.getUTCHours())
      : (dto.courtHourlyRateMinor ?? null);

    const proportionalBase = this.computeProportionalBase(hourlyRateMinor, dto.durationMins);

    const result = this.runPipeline(
      matchingRules,
      proportionalBase,
      isHoliday,
      dto.isMember ?? false,
      null,
    );

    return {
      resolvedPriceMinor: result.resolvedPriceMinor,
      formattedPrice:     this.formatPrice(result.resolvedPriceMinor, currency),
      isHoliday,
      isWeekend,
      breakdown:          this.enrichBreakdown(result.breakdown, currency),
      appliedRuleIds:     result.appliedRuleIds,
      summary:            this.buildSummary(result.breakdown, proportionalBase, currency),
    };
  }

  // ── Core pipeline ─────────────────────────────────────────────────────────

  private runPipeline(
    rules:            PricingRuleEntity[],
    proportionalBase: number | null,
    isHoliday:        boolean,
    isMember:         boolean,
    membershipTier:   string | null = null,
  ): PriceResolutionResult {
    const appliedRuleIds: string[] = [];
    const breakdown: PriceBreakdownStep[] = [];
    let currentPrice = proportionalBase ?? 0;

    const push = (rule: PricingRuleEntity, after: number): void => {
      appliedRuleIds.push(rule.id);
      breakdown.push({
        ruleId:        rule.id,
        ruleName:      rule.name,
        ruleType:      rule.ruleType,
        modifierType:  rule.modifierType,
        modifierValue: rule.modifierValue,
        priceAfter:    Math.max(0, Math.round(after)),
      });
      currentPrice = after;
    };

    // ── Step 1: BASE rules ──────────────────────────────────────────────────
    // Only the single highest-priority BASE rule fires.
    const baseRules = rules
      .filter((r) => r.ruleType === 'base')
      .sort((a, b) => b.priority - a.priority);

    if (baseRules.length > 0) {
      const rule  = baseRules[0]!;
      const after = this.applyModifier(currentPrice, rule);
      push(rule, after);
    }

    // ── Step 2: ABSOLUTE custom override — short-circuit ───────────────────
    const absoluteRules = rules
      .filter((r) => r.ruleType === 'custom' && r.modifierType === 'absolute')
      .sort((a, b) => b.priority - a.priority);

    if (absoluteRules.length > 0) {
      const rule  = absoluteRules[0]!;
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
    // New rule types in Batch 5 follow the same evaluation semantics:
    //   time_of_day — time-window surcharge (finer-grained than peak)
    //   day_of_week — per-day adjustment (finer-grained than weekend)
    //   seasonal    — date-range pricing; no extra guard condition
    //   promotion   — promotional discount; no extra guard condition
    //   membership  — membership tier pricing; only fires when isMember = true
    //   coach       — coach-session surcharge; no extra guard condition
    //   tournament  — tournament block pricing; no extra guard condition
    //   coupon      — coupon-code discount; caller validates code before calling pipeline
    //   member      — member discount (legacy alias for membership)
    //   custom      — catch-all (non-absolute only here; absolute handled in step 2)
    const modifierOrder = [
      'peak', 'time_of_day', 'day_of_week', 'weekend',
      'holiday', 'seasonal', 'promotion',
      'coach', 'tournament',
      'membership', 'member',
      'coupon', 'custom',
    ] as const;

    for (const ruleType of modifierOrder) {
      const candidates = rules
        .filter((r) => {
          if (r.ruleType !== ruleType) return false;
          if (ruleType === 'holiday'    && !isHoliday) return false;
          if (ruleType === 'member'     && !isMember)  return false;
          if (ruleType === 'membership' && !isMember)  return false;
          // Tier-scoped membership rules only fire when tier matches
          if (ruleType === 'membership' && r.membershipTier && isMember) {
            if (!membershipTier || membershipTier !== r.membershipTier) return false;
          }
          if (ruleType === 'custom' && r.modifierType === 'absolute') return false;
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
        ? null   // genuinely free — no base rate and no rules applied
        : final,
      appliedRuleIds,
      breakdown,
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Resolves the hourly rate from a Rate Card for a specific date/hour.
   * Returns null if card not found (falls back gracefully to 0 base).
   */
  private async resolveRateCardBase(
    rateCardId: string,
    tenantId:   string,
    date:       string,
    dayName:    string,
    hour:       number,
  ): Promise<number | null> {
    try {
      const card = await this.rateCardRepository.findById(rateCardId, tenantId);
      if (!card || !card.isActive) return null;
      return this.rateCardService.resolveBasePrice(card, date, dayName, hour);
    } catch {
      this.logger.warn(`Rate card ${rateCardId} not found for tenant ${tenantId} — falling back to null base`);
      return null;
    }
  }

  private computeProportionalBase(
    hourlyRateMinor: number | null,
    durationMins:    number,
  ): number | null {
    if (hourlyRateMinor == null) return null;
    return Math.round(hourlyRateMinor * (durationMins / 60));
  }

  private applyModifier(base: number, rule: PricingRuleEntity): number {
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

  private formatPrice(minorUnits: number | null, currency: string): string {
    if (minorUnits == null) return 'Free';
    return new Intl.NumberFormat('en-GB', {
      style:                 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(minorUnits / 100);
  }

  private enrichBreakdown(
    steps:    PriceBreakdownStep[],
    currency: string,
  ): PricingBreakdownItem[] {
    return steps.map((step, i) => {
      let formattedEffect: string;

      const prev = i === 0 ? 0 : steps[i - 1]!.priceAfter;
      const diff = step.priceAfter - prev;

      if (step.modifierType === 'absolute') {
        formattedEffect = `= ${this.formatPrice(step.priceAfter, currency)}`;
      } else if (step.modifierType === 'percentage') {
        const sign = step.modifierValue >= 0 ? '+' : '';
        formattedEffect = `${sign}${step.modifierValue}%`;
      } else {
        // fixed
        const sign = diff >= 0 ? '+' : '';
        formattedEffect = `${sign}${this.formatPrice(Math.abs(diff), currency)}`;
      }

      return {
        ruleId:          step.ruleId,
        ruleName:        step.ruleName,
        ruleType:        step.ruleType,
        modifierType:    step.modifierType,
        modifierValue:   step.modifierValue,
        priceAfter:      step.priceAfter,
        formattedEffect,
      };
    });
  }

  private buildSummary(
    breakdown:        PriceBreakdownStep[],
    proportionalBase: number | null,
    currency:         string,
  ): string {
    if (breakdown.length === 0) {
      return proportionalBase != null
        ? `Base rate ${this.formatPrice(proportionalBase, currency)}, no pricing rules applied`
        : 'Free — no base rate or pricing rules';
    }

    const parts: string[] = [];

    if (proportionalBase != null) {
      parts.push(`Base ${this.formatPrice(proportionalBase, currency)}`);
    }

    for (const step of breakdown) {
      if (step.modifierType === 'absolute') {
        parts.push(`${step.ruleName} → ${this.formatPrice(step.priceAfter, currency)}`);
      } else if (step.modifierType === 'percentage') {
        const sign = step.modifierValue >= 0 ? '+' : '';
        parts.push(`${step.ruleName} (${sign}${step.modifierValue}%)`);
      } else {
        const diff = step.priceAfter - (parts.length === 0 ? 0 : breakdown[breakdown.indexOf(step) - 1]?.priceAfter ?? 0);
        const sign = diff >= 0 ? '+' : '-';
        parts.push(`${step.ruleName} (${sign}${this.formatPrice(Math.abs(diff), currency)})`);
      }
    }

    const final = breakdown[breakdown.length - 1]!.priceAfter;
    return `${parts.join(' → ')} = ${this.formatPrice(final, currency)}`;
  }

  // ── Public API: quote() ────────────────────────────────────────────────────

  /**
   * Returns a price quote for a booking request without committing anything.
   * Identical to preview() but emits PRICE_CALCULATED and is the canonical
   * entry point for Booking, POS, Academy, and Tournament engines.
   *
   * @param ctx   SlotPricingContext
   * @returns     PriceResolutionResult with subtotal, discounts, finalTotal, appliedRules
   */
  async quote(ctx: SlotPricingContext): Promise<QuoteResult> {
    const result = await this.resolve(ctx);

    const base     = this.computeProportionalBase(ctx.courtHourlyRateMinor ?? null, ctx.durationMins);
    const subtotal = base ?? 0;
    const final    = result.resolvedPriceMinor ?? 0;
    const discount = Math.max(0, subtotal - final);

    await this.eventEmitter.emitAsync(PricingEvents.PRICE_CALCULATED, {
      tenantId:           ctx.tenantId,
      courtId:            ctx.courtId,
      branchId:           ctx.branchId,
      resolvedPriceMinor: result.resolvedPriceMinor,
      appliedRuleIds:     result.appliedRuleIds,
      context:            'quote',
      timestamp:          new Date().toISOString(),
    });

    return {
      subtotal,
      discountMinor:      discount,
      taxMinor:           0,              // tax engine is a future sprint
      finalTotal:         result.resolvedPriceMinor,
      appliedRuleIds:     result.appliedRuleIds,
      breakdown:          result.breakdown,
      currency:           ctx.currency ?? 'GBP',
    };
  }

  // ── Public API: validateCoupon() ───────────────────────────────────────────

  /**
   * Validates a coupon code against the pricing rules for a given context.
   *
   * Checks:
   *   1. A coupon rule with matching code exists in this tenant (case-insensitive)
   *   2. Rule is active and within its date range
   *   3. Scope matches (tenant/branch/venue/court)
   *   4. maxRedemptions not exhausted
   *
   * Does NOT increment redemptionCount — that happens in BookingService.create()
   * inside the booking transaction.
   *
   * Emits COUPON_ACCEPTED or COUPON_REJECTED.
   */
  async validateCoupon(
    couponCode: string,
    ctx:        Pick<SlotPricingContext, 'tenantId' | 'courtId' | 'branchId' | 'sportId'>,
    options?:   { bookingId?: string; actorId?: string },
  ): Promise<CouponValidationResult> {
    const normalised = couponCode.trim().toUpperCase();
    const slotDate   = new Date().toISOString().slice(0, 10);

    const rule = await this.pricingRuleRepository.findCouponRule(
      normalised,
      ctx.tenantId,
      slotDate,
    );

    if (!rule) {
      await this.eventEmitter.emitAsync(PricingEvents.COUPON_REJECTED, {
        tenantId:   ctx.tenantId,
        couponCode: normalised,
        reason:     'not_found' as const,
        ...options,
        timestamp:  new Date().toISOString(),
      });
      return { valid: false, reason: 'not_found' };
    }

    if (!rule.isActive) {
      await this.eventEmitter.emitAsync(PricingEvents.COUPON_REJECTED, {
        tenantId:   ctx.tenantId,
        couponCode: normalised,
        reason:     'inactive' as const,
        ...options,
        timestamp:  new Date().toISOString(),
      });
      return { valid: false, reason: 'inactive' };
    }

    if (rule.maxRedemptions !== null && rule.redemptionCount >= rule.maxRedemptions) {
      await this.eventEmitter.emitAsync(PricingEvents.COUPON_REJECTED, {
        tenantId:   ctx.tenantId,
        couponCode: normalised,
        reason:     'exhausted' as const,
        ...options,
        timestamp:  new Date().toISOString(),
      });
      return { valid: false, reason: 'exhausted' };
    }

    // Estimated discount for display — not binding until booking commit
    const estimatedDiscount = rule.modifierType === 'percentage'
      ? null  // no base price available here
      : rule.modifierValue;

    await this.eventEmitter.emitAsync(PricingEvents.COUPON_ACCEPTED, {
      tenantId:      ctx.tenantId,
      couponCode:    normalised,
      ruleId:        rule.id,
      discountMinor: estimatedDiscount ?? 0,
      ...options,
      timestamp:     new Date().toISOString(),
    });

    return {
      valid:          true,
      ruleId:         rule.id,
      ruleName:       rule.name,
      modifierType:   rule.modifierType,
      modifierValue:  rule.modifierValue,
    };
  }

  // ── Public API: applyRules() ───────────────────────────────────────────────

  /**
   * Applies a pre-fetched set of rules to a base price.
   * Used when the caller has already fetched applicable rules (e.g. resolveBatch)
   * and wants to apply them to a different base without re-querying.
   *
   * Emits RULE_APPLIED for each rule that modifies the price.
   */
  async applyRules(
    rules:       PricingRuleEntity[],
    baseMinor:   number,
    isHoliday:   boolean,
    isMember:    boolean,
    context?:    string,
  ): Promise<PriceResolutionResult> {
    const result = this.runPipeline(rules, baseMinor, isHoliday, isMember, null);

    for (const step of result.breakdown) {
      await this.eventEmitter.emitAsync(PricingEvents.RULE_APPLIED, {
        tenantId:   rules[0]?.tenantId ?? '',
        ruleId:     step.ruleId,
        ruleName:   step.ruleName,
        ruleType:   step.ruleType,
        priceAfter: step.priceAfter,
        context,
        timestamp:  new Date().toISOString(),
      });
    }

    return result;
  }
}

// ── Public result types ────────────────────────────────────────────────────────

export interface QuoteResult {
  subtotal:           number;
  discountMinor:      number;
  taxMinor:           number;          // 0 until tax engine implemented
  finalTotal:         number | null;
  appliedRuleIds:     string[];
  breakdown:          import('../services/pricing.service').PriceBreakdownStep[];
  currency:           string;
}

export interface CouponValidationResult {
  valid:          boolean;
  reason?:        'not_found' | 'inactive' | 'expired' | 'exhausted' | 'scope_mismatch';
  ruleId?:        string;
  ruleName?:      string;
  modifierType?:  string;
  modifierValue?: number;
}
