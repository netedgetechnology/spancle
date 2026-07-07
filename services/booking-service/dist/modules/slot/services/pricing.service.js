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
const event_emitter_1 = require("@nestjs/event-emitter");
const pricing_rule_repository_1 = require("../repositories/pricing-rule.repository");
const holiday_repository_1 = require("../repositories/holiday.repository");
const rate_card_repository_1 = require("../repositories/rate-card.repository");
const rate_card_service_1 = require("./rate-card.service");
const slot_utils_1 = require("../utils/slot.utils");
const pricing_events_1 = require("../events/pricing.events");
let PricingService = PricingService_1 = class PricingService {
    constructor(pricingRuleRepository, holidayRepository, rateCardService, rateCardRepository, eventEmitter) {
        this.pricingRuleRepository = pricingRuleRepository;
        this.holidayRepository = holidayRepository;
        this.rateCardService = rateCardService;
        this.rateCardRepository = rateCardRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(PricingService_1.name);
    }
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
        const hourlyRateMinor = ctx.rateCardId
            ? await this.resolveRateCardBase(ctx.rateCardId, ctx.tenantId, slotDate, dayOfWeek, ctx.startAt.getUTCHours())
            : ctx.courtHourlyRateMinor;
        const proportionalBase = this.computeProportionalBase(hourlyRateMinor, ctx.durationMins);
        return this.runPipeline(matchingRules, proportionalBase, isHoliday, ctx.isMember);
    }
    async resolveBatch(slots) {
        if (slots.length === 0)
            return [];
        const dates = slots.map((s) => s.startAt.toISOString().slice(0, 10)).sort();
        const startDate = dates[0];
        const endDate = dates[dates.length - 1];
        const tenantId = slots[0].tenantId;
        const holidayDates = await this.holidayRepository.getHolidayDatesInRange(tenantId, startDate, endDate);
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
            const hourlyRateMinor = ctx.rateCardId
                ? await this.resolveRateCardBase(ctx.rateCardId, ctx.tenantId, slotDate, dayOfWeek, ctx.startAt.getUTCHours())
                : ctx.courtHourlyRateMinor;
            const proportionalBase = this.computeProportionalBase(hourlyRateMinor, ctx.durationMins);
            return this.runPipeline(matchingRules, proportionalBase, isHoliday, ctx.isMember);
        }));
    }
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
        const hourlyRateMinor = dto.rateCardId
            ? await this.resolveRateCardBase(dto.rateCardId, tenantId, slotDate, dayOfWeek, startAt.getUTCHours())
            : (dto.courtHourlyRateMinor ?? null);
        const proportionalBase = this.computeProportionalBase(hourlyRateMinor, dto.durationMins);
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
        const baseRules = rules
            .filter((r) => r.ruleType === 'base')
            .sort((a, b) => b.priority - a.priority);
        if (baseRules.length > 0) {
            const rule = baseRules[0];
            const after = this.applyModifier(currentPrice, rule);
            push(rule, after);
        }
        const absoluteRules = rules
            .filter((r) => r.ruleType === 'custom' && r.modifierType === 'absolute')
            .sort((a, b) => b.priority - a.priority);
        if (absoluteRules.length > 0) {
            const rule = absoluteRules[0];
            const after = rule.modifierValue;
            push(rule, after);
            return {
                resolvedPriceMinor: Math.max(0, Math.round(currentPrice)),
                appliedRuleIds,
                breakdown,
            };
        }
        const modifierOrder = ['peak', 'weekend', 'holiday', 'member', 'custom'];
        for (const ruleType of modifierOrder) {
            const candidates = rules
                .filter((r) => {
                if (r.ruleType !== ruleType)
                    return false;
                if (ruleType === 'holiday' && !isHoliday)
                    return false;
                if (ruleType === 'member' && !isMember)
                    return false;
                return true;
            })
                .sort((a, b) => b.priority - a.priority);
            for (const rule of candidates) {
                const after = this.applyModifier(currentPrice, rule);
                push(rule, after);
            }
        }
        const final = Math.max(0, Math.round(currentPrice));
        return {
            resolvedPriceMinor: proportionalBase === null && appliedRuleIds.length === 0
                ? null
                : final,
            appliedRuleIds,
            breakdown,
        };
    }
    async resolveRateCardBase(rateCardId, tenantId, date, dayName, hour) {
        try {
            const card = await this.rateCardRepository.findById(rateCardId, tenantId);
            if (!card || !card.isActive)
                return null;
            return this.rateCardService.resolveBasePrice(card, date, dayName, hour);
        }
        catch {
            this.logger.warn(`Rate card ${rateCardId} not found for tenant ${tenantId} — falling back to null base`);
            return null;
        }
    }
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
    async quote(ctx) {
        const result = await this.resolve(ctx);
        const base = this.computeProportionalBase(ctx.courtHourlyRateMinor ?? null, ctx.durationMins);
        const subtotal = base ?? 0;
        const final = result.resolvedPriceMinor ?? 0;
        const discount = Math.max(0, subtotal - final);
        await this.eventEmitter.emitAsync(pricing_events_1.PricingEvents.PRICE_CALCULATED, {
            tenantId: ctx.tenantId,
            courtId: ctx.courtId,
            branchId: ctx.branchId,
            resolvedPriceMinor: result.resolvedPriceMinor,
            appliedRuleIds: result.appliedRuleIds,
            context: 'quote',
            timestamp: new Date().toISOString(),
        });
        return {
            subtotal,
            discountMinor: discount,
            taxMinor: 0,
            finalTotal: result.resolvedPriceMinor,
            appliedRuleIds: result.appliedRuleIds,
            breakdown: result.breakdown,
            currency: ctx.currency ?? 'GBP',
        };
    }
    async validateCoupon(couponCode, ctx, options) {
        const normalised = couponCode.trim().toUpperCase();
        const slotDate = new Date().toISOString().slice(0, 10);
        const rule = await this.pricingRuleRepository.findCouponRule(normalised, ctx.tenantId, slotDate);
        if (!rule) {
            await this.eventEmitter.emitAsync(pricing_events_1.PricingEvents.COUPON_REJECTED, {
                tenantId: ctx.tenantId,
                couponCode: normalised,
                reason: 'not_found',
                ...options,
                timestamp: new Date().toISOString(),
            });
            return { valid: false, reason: 'not_found' };
        }
        if (!rule.isActive) {
            await this.eventEmitter.emitAsync(pricing_events_1.PricingEvents.COUPON_REJECTED, {
                tenantId: ctx.tenantId,
                couponCode: normalised,
                reason: 'inactive',
                ...options,
                timestamp: new Date().toISOString(),
            });
            return { valid: false, reason: 'inactive' };
        }
        if (rule.maxRedemptions !== null && rule.redemptionCount >= rule.maxRedemptions) {
            await this.eventEmitter.emitAsync(pricing_events_1.PricingEvents.COUPON_REJECTED, {
                tenantId: ctx.tenantId,
                couponCode: normalised,
                reason: 'exhausted',
                ...options,
                timestamp: new Date().toISOString(),
            });
            return { valid: false, reason: 'exhausted' };
        }
        const estimatedDiscount = rule.modifierType === 'percentage'
            ? null
            : rule.modifierValue;
        await this.eventEmitter.emitAsync(pricing_events_1.PricingEvents.COUPON_ACCEPTED, {
            tenantId: ctx.tenantId,
            couponCode: normalised,
            ruleId: rule.id,
            discountMinor: estimatedDiscount ?? 0,
            ...options,
            timestamp: new Date().toISOString(),
        });
        return {
            valid: true,
            ruleId: rule.id,
            ruleName: rule.name,
            modifierType: rule.modifierType,
            modifierValue: rule.modifierValue,
        };
    }
    async applyRules(rules, baseMinor, isHoliday, isMember, context) {
        const result = this.runPipeline(rules, baseMinor, isHoliday, isMember);
        for (const step of result.breakdown) {
            await this.eventEmitter.emitAsync(pricing_events_1.PricingEvents.RULE_APPLIED, {
                tenantId: rules[0]?.tenantId ?? '',
                ruleId: step.ruleId,
                ruleName: step.ruleName,
                ruleType: step.ruleType,
                priceAfter: step.priceAfter,
                context,
                timestamp: new Date().toISOString(),
            });
        }
        return result;
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = PricingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pricing_rule_repository_1.PricingRuleRepository,
        holiday_repository_1.HolidayRepository,
        rate_card_service_1.RateCardService,
        rate_card_repository_1.RateCardRepository,
        event_emitter_1.EventEmitter2])
], PricingService);
//# sourceMappingURL=pricing.service.js.map