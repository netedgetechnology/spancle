import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { CommercialEvents }   from '../events/commercial.events';
import { CommercialRuleType, RuleEvaluationOutcome } from '../enums/commercial.enums';
import type { CommercialRuleVersionEntity } from '../entities/commercial-rule-version.entity';
import type {
  IRuleResolver,
  RuleBundle,
  EvaluatedRule,
  PricingRule,
  DiscountRule,
  PromotionRule,
  TrialRule,
  TaxRule,
  TypedRule,
  PricingRuleDefinition,
  DiscountRuleDefinition,
  PromotionRuleDefinition,
  TrialRuleDefinition,
  TaxRuleDefinition,
} from '../interfaces/rule-resolver.interfaces';

/**
 * Evaluation priority order — determines execution sequence within the pipeline.
 * Lower number = evaluated first.
 */
const EVALUATION_ORDER: Record<CommercialRuleType, number> = {
  [CommercialRuleType.PRICING]:      1,
  [CommercialRuleType.DISCOUNT]:     2,
  [CommercialRuleType.PROMOTION]:    3,
  [CommercialRuleType.TRIAL]:        4,
  [CommercialRuleType.TAX]:          5,  // reference only — not evaluated
  [CommercialRuleType.ELIGIBILITY]:  6,
  [CommercialRuleType.RESTRICTION]:  7,
  [CommercialRuleType.DISTRIBUTION]: 8,
};

/**
 * DefaultRuleResolver
 *
 * Builds a typed, deterministically ordered RuleBundle from pre-loaded
 * CommercialRuleVersionEntity records. No DB access — operates entirely
 * on in-memory immutable version entities.
 *
 * Immutability guarantee:
 *   All data is read from CommercialRuleVersionEntity.definition (JSONB).
 *   The mutable rule entity is never accessed at evaluation time.
 *   The input ruleVersions array is not mutated.
 *
 * Rule ordering:
 *   PRICING(1) → DISCOUNT(2) → PROMOTION(3) → TRIAL(4)
 *   → TAX(5, ref only) → ELIGIBILITY(6) → RESTRICTION(7) → DISTRIBUTION(8)
 *
 * Unknown rule types are skipped with a warning. No exceptions thrown for
 * unknown types — the pipeline must remain resilient.
 */
@Injectable()
export class DefaultRuleResolver implements IRuleResolver {
  private readonly logger = new Logger(DefaultRuleResolver.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  resolve(
    ruleVersions: ReadonlyArray<Readonly<CommercialRuleVersionEntity>>,
  ): RuleBundle {
    const resolvedAt = new Date();

    // Sort by deterministic evaluation order (stable sort — preserves insertion order within type)
    const sorted = [...ruleVersions].sort((a, b) => {
      const aOrder = EVALUATION_ORDER[a.ruleType as CommercialRuleType] ?? 99;
      const bOrder = EVALUATION_ORDER[b.ruleType as CommercialRuleType] ?? 99;
      return aOrder - bOrder;
    });

    const pricingRules:   PricingRule[]   = [];
    const discountRules:  DiscountRule[]  = [];
    const promotionRules: PromotionRule[] = [];
    const trialRules:     TrialRule[]     = [];
    const taxRules:       TaxRule[]       = [];
    const evaluatedRules: EvaluatedRule[] = [];

    for (const rv of sorted) {
      const ruleType = rv.ruleType as CommercialRuleType;

      switch (ruleType) {
        case CommercialRuleType.PRICING: {
          const def = this.extractDefinition<PricingRuleDefinition>(rv, ['basePriceMinor', 'currency']);
          if (def) {
            pricingRules.push({ ruleVersion: rv, definition: def, ruleType });
            evaluatedRules.push(this.evaluated(rv, ruleType, RuleEvaluationOutcome.APPLIED,
              `Pricing rule applied: basePriceMinor=${def.basePriceMinor} ${def.currency}`));
          }
          break;
        }
        case CommercialRuleType.DISCOUNT: {
          const def = this.extractDefinition<DiscountRuleDefinition>(rv, ['discountBps', 'maxDiscountMinor']);
          if (def) {
            discountRules.push({ ruleVersion: rv, definition: def, ruleType });
            evaluatedRules.push(this.evaluated(rv, ruleType, RuleEvaluationOutcome.APPLIED,
              `Discount rule applied: ${def.discountBps}bps (max ${def.maxDiscountMinor} minor units)`));
          }
          break;
        }
        case CommercialRuleType.PROMOTION: {
          const def = this.extractDefinition<PromotionRuleDefinition>(rv, ['discountBps']);
          if (def) {
            promotionRules.push({ ruleVersion: rv, definition: def, ruleType });
            evaluatedRules.push(this.evaluated(rv, ruleType, RuleEvaluationOutcome.APPLIED,
              `Promotion rule applied: ${def.discountBps}bps${def.promotionCode ? ` (code=${def.promotionCode})` : ''}`));
          }
          break;
        }
        case CommercialRuleType.TRIAL: {
          const def = this.extractDefinition<TrialRuleDefinition>(rv, ['trialDays', 'trialPriceMinor', 'currency']);
          if (def) {
            trialRules.push({ ruleVersion: rv, definition: def, ruleType });
            evaluatedRules.push(this.evaluated(rv, ruleType, RuleEvaluationOutcome.APPLIED,
              `Trial rule applied: ${def.trialDays} days @ ${def.trialPriceMinor} ${def.currency}`));
          }
          break;
        }
        case CommercialRuleType.TAX: {
          // TAX is a reference — classified but not evaluated in this service
          const def = this.extractDefinition<TaxRuleDefinition>(rv, ['taxCode', 'rateBps']);
          if (def) {
            taxRules.push({ ruleVersion: rv, definition: def, ruleType });
            evaluatedRules.push(this.evaluated(rv, ruleType, RuleEvaluationOutcome.SKIPPED,
              `Tax rule classified (reference only): ${def.taxCode} @ ${def.rateBps}bps`));
          }
          break;
        }
        case CommercialRuleType.ELIGIBILITY:
        case CommercialRuleType.RESTRICTION:
        case CommercialRuleType.DISTRIBUTION: {
          // These types are evaluated by future batches; recorded as SKIPPED for now
          evaluatedRules.push(this.evaluated(rv, ruleType, RuleEvaluationOutcome.SKIPPED,
            `${ruleType} rule deferred to downstream evaluator`));
          break;
        }
        default: {
          this.logger.warn(`DefaultRuleResolver: unknown rule type "${ruleType}" for version ${rv.id} — skipping`);
          evaluatedRules.push(this.evaluated(rv, ruleType as CommercialRuleType, RuleEvaluationOutcome.SKIPPED,
            `Unknown rule type "${ruleType}" — skipped`));
        }
      }
    }

    // Primary rule ID: first PRICING rule, else first applied rule, else null
    const primaryVersion =
      pricingRules[0]?.ruleVersion ??
      evaluatedRules.find((e) => e.outcome === RuleEvaluationOutcome.APPLIED)?.ruleVersion ??
      null;

    const bundle: RuleBundle = {
      pricingRules,
      discountRules,
      promotionRules,
      trialRules,
      taxRules,
      evaluatedRules,
      primaryRuleVersionId:     primaryVersion?.id     ?? null,
      primaryRuleVersionSemver: primaryVersion?.version ?? null,
      resolvedAt,
    };

    this.logger.debug(
      `resolve: pricing=${pricingRules.length} discount=${discountRules.length} ` +
      `promotion=${promotionRules.length} trial=${trialRules.length} ` +
      `tax=${taxRules.length}(ref) total=${ruleVersions.length}`,
    );

    this.eventEmitter.emitAsync(CommercialEvents.RULES_RESOLVED, {
      pricingCount:   pricingRules.length,
      discountCount:  discountRules.length,
      promotionCount: promotionRules.length,
      trialCount:     trialRules.length,
      taxCount:       taxRules.length,
      primaryRuleVersionId: bundle.primaryRuleVersionId,
      resolvedAt:     resolvedAt.toISOString(),
    }).catch(() => {/* fire-and-forget */});

    return bundle;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Extracts and validates a typed definition from CommercialRuleVersionEntity.definition.
   * Returns null and logs a warning when required fields are missing.
   * Never throws — the pipeline must remain resilient to malformed definitions.
   */
  private extractDefinition<T>(
    rv:             Readonly<CommercialRuleVersionEntity>,
    requiredFields: string[],
  ): T | null {
    const def = rv.definition as Record<string, unknown>;
    const missing = requiredFields.filter((f) => !(f in def));
    if (missing.length > 0) {
      this.logger.warn(
        `DefaultRuleResolver: rule version ${rv.id} (${rv.ruleType}) missing ` +
        `required definition fields: [${missing.join(', ')}] — skipping`,
      );
      this.eventEmitter.emitAsync(CommercialEvents.RULE_EVALUATION_FAILED, {
        ruleVersionId: rv.id,
        ruleType:      rv.ruleType,
        reason:        `Missing required fields: ${missing.join(', ')}`,
      }).catch(() => {/* fire-and-forget */});
      return null;
    }
    return def as T;
  }

  private evaluated(
    rv:      Readonly<CommercialRuleVersionEntity>,
    ruleType: CommercialRuleType,
    outcome: RuleEvaluationOutcome,
    reason:  string,
  ): EvaluatedRule {
    return { ruleVersion: rv, ruleType, outcome, reason, definition: rv.definition };
  }
}
