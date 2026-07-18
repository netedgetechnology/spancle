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
var DefaultRuleResolver_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultRuleResolver = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const commercial_events_1 = require("../events/commercial.events");
const commercial_enums_1 = require("../enums/commercial.enums");
const EVALUATION_ORDER = {
    [commercial_enums_1.CommercialRuleType.PRICING]: 1,
    [commercial_enums_1.CommercialRuleType.DISCOUNT]: 2,
    [commercial_enums_1.CommercialRuleType.PROMOTION]: 3,
    [commercial_enums_1.CommercialRuleType.TRIAL]: 4,
    [commercial_enums_1.CommercialRuleType.TAX]: 5,
    [commercial_enums_1.CommercialRuleType.ELIGIBILITY]: 6,
    [commercial_enums_1.CommercialRuleType.RESTRICTION]: 7,
    [commercial_enums_1.CommercialRuleType.DISTRIBUTION]: 8,
};
let DefaultRuleResolver = DefaultRuleResolver_1 = class DefaultRuleResolver {
    constructor(eventEmitter) {
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(DefaultRuleResolver_1.name);
    }
    resolve(ruleVersions) {
        const resolvedAt = new Date();
        const sorted = [...ruleVersions].sort((a, b) => {
            const aOrder = EVALUATION_ORDER[a.ruleType] ?? 99;
            const bOrder = EVALUATION_ORDER[b.ruleType] ?? 99;
            return aOrder - bOrder;
        });
        const pricingRules = [];
        const discountRules = [];
        const promotionRules = [];
        const trialRules = [];
        const taxRules = [];
        const evaluatedRules = [];
        for (const rv of sorted) {
            const ruleType = rv.ruleType;
            switch (ruleType) {
                case commercial_enums_1.CommercialRuleType.PRICING: {
                    const def = this.extractDefinition(rv, ['basePriceMinor', 'currency']);
                    if (def) {
                        pricingRules.push({ ruleVersion: rv, definition: def, ruleType });
                        evaluatedRules.push(this.evaluated(rv, ruleType, commercial_enums_1.RuleEvaluationOutcome.APPLIED, `Pricing rule applied: basePriceMinor=${def.basePriceMinor} ${def.currency}`));
                    }
                    break;
                }
                case commercial_enums_1.CommercialRuleType.DISCOUNT: {
                    const def = this.extractDefinition(rv, ['discountBps', 'maxDiscountMinor']);
                    if (def) {
                        discountRules.push({ ruleVersion: rv, definition: def, ruleType });
                        evaluatedRules.push(this.evaluated(rv, ruleType, commercial_enums_1.RuleEvaluationOutcome.APPLIED, `Discount rule applied: ${def.discountBps}bps (max ${def.maxDiscountMinor} minor units)`));
                    }
                    break;
                }
                case commercial_enums_1.CommercialRuleType.PROMOTION: {
                    const def = this.extractDefinition(rv, ['discountBps']);
                    if (def) {
                        promotionRules.push({ ruleVersion: rv, definition: def, ruleType });
                        evaluatedRules.push(this.evaluated(rv, ruleType, commercial_enums_1.RuleEvaluationOutcome.APPLIED, `Promotion rule applied: ${def.discountBps}bps${def.promotionCode ? ` (code=${def.promotionCode})` : ''}`));
                    }
                    break;
                }
                case commercial_enums_1.CommercialRuleType.TRIAL: {
                    const def = this.extractDefinition(rv, ['trialDays', 'trialPriceMinor', 'currency']);
                    if (def) {
                        trialRules.push({ ruleVersion: rv, definition: def, ruleType });
                        evaluatedRules.push(this.evaluated(rv, ruleType, commercial_enums_1.RuleEvaluationOutcome.APPLIED, `Trial rule applied: ${def.trialDays} days @ ${def.trialPriceMinor} ${def.currency}`));
                    }
                    break;
                }
                case commercial_enums_1.CommercialRuleType.TAX: {
                    const def = this.extractDefinition(rv, ['taxCode', 'rateBps']);
                    if (def) {
                        taxRules.push({ ruleVersion: rv, definition: def, ruleType });
                        evaluatedRules.push(this.evaluated(rv, ruleType, commercial_enums_1.RuleEvaluationOutcome.SKIPPED, `Tax rule classified (reference only): ${def.taxCode} @ ${def.rateBps}bps`));
                    }
                    break;
                }
                case commercial_enums_1.CommercialRuleType.ELIGIBILITY:
                case commercial_enums_1.CommercialRuleType.RESTRICTION:
                case commercial_enums_1.CommercialRuleType.DISTRIBUTION: {
                    evaluatedRules.push(this.evaluated(rv, ruleType, commercial_enums_1.RuleEvaluationOutcome.SKIPPED, `${ruleType} rule deferred to downstream evaluator`));
                    break;
                }
                default: {
                    this.logger.warn(`DefaultRuleResolver: unknown rule type "${ruleType}" for version ${rv.id} — skipping`);
                    evaluatedRules.push(this.evaluated(rv, ruleType, commercial_enums_1.RuleEvaluationOutcome.SKIPPED, `Unknown rule type "${ruleType}" — skipped`));
                }
            }
        }
        const primaryVersion = pricingRules[0]?.ruleVersion ??
            evaluatedRules.find((e) => e.outcome === commercial_enums_1.RuleEvaluationOutcome.APPLIED)?.ruleVersion ??
            null;
        const bundle = {
            pricingRules,
            discountRules,
            promotionRules,
            trialRules,
            taxRules,
            evaluatedRules,
            primaryRuleVersionId: primaryVersion?.id ?? null,
            primaryRuleVersionSemver: primaryVersion?.version ?? null,
            resolvedAt,
        };
        this.logger.debug(`resolve: pricing=${pricingRules.length} discount=${discountRules.length} ` +
            `promotion=${promotionRules.length} trial=${trialRules.length} ` +
            `tax=${taxRules.length}(ref) total=${ruleVersions.length}`);
        this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.RULES_RESOLVED, {
            pricingCount: pricingRules.length,
            discountCount: discountRules.length,
            promotionCount: promotionRules.length,
            trialCount: trialRules.length,
            taxCount: taxRules.length,
            primaryRuleVersionId: bundle.primaryRuleVersionId,
            resolvedAt: resolvedAt.toISOString(),
        }).catch(() => { });
        return bundle;
    }
    extractDefinition(rv, requiredFields) {
        const def = rv.definition;
        const missing = requiredFields.filter((f) => !(f in def));
        if (missing.length > 0) {
            this.logger.warn(`DefaultRuleResolver: rule version ${rv.id} (${rv.ruleType}) missing ` +
                `required definition fields: [${missing.join(', ')}] — skipping`);
            this.eventEmitter.emitAsync(commercial_events_1.CommercialEvents.RULE_EVALUATION_FAILED, {
                ruleVersionId: rv.id,
                ruleType: rv.ruleType,
                reason: `Missing required fields: ${missing.join(', ')}`,
            }).catch(() => { });
            return null;
        }
        return def;
    }
    evaluated(rv, ruleType, outcome, reason) {
        return { ruleVersion: rv, ruleType, outcome, reason, definition: rv.definition };
    }
};
exports.DefaultRuleResolver = DefaultRuleResolver;
exports.DefaultRuleResolver = DefaultRuleResolver = DefaultRuleResolver_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [event_emitter_1.EventEmitter2])
], DefaultRuleResolver);
//# sourceMappingURL=default-rule-resolver.js.map