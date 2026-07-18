/**
 * rule-resolver.interfaces.ts
 *
 * Contract for the Commercial Rule Engine.
 *
 * The RuleBundle is a typed, deterministically ordered view over the
 * CommercialRuleVersionEntity records already loaded by DefaultPolicyResolver.
 * No additional DB queries — the rule engine operates on pre-loaded immutable versions.
 *
 * Rule evaluation order is deterministic:
 *   1. PRICING     — base price computation
 *   2. DISCOUNT    — reductions on top of base price
 *   3. PROMOTION   — limited-time or campaign offers
 *   4. TRIAL       — trial period eligibility and pricing
 *   5. TAX         — reference only; not evaluated in this service
 *   6. ELIGIBILITY — access control
 *   7. RESTRICTION — usage restrictions
 *   8. DISTRIBUTION — revenue split references
 *
 * All evaluation reads exclusively from CommercialRuleVersionEntity.definition
 * (immutable JSONB). Mutable CommercialRuleEntity fields are never read at runtime.
 */
import type { CommercialRuleVersionEntity } from '../entities/commercial-rule-version.entity';
import type { CommercialRuleType, RuleEvaluationOutcome } from '../enums/commercial.enums';

// ── Typed rule wrappers ───────────────────────────────────────────────────────

/**
 * Base wrapper for a typed rule — carries the immutable version entity and
 * the strongly-typed definition extracted from the JSONB column.
 */
export interface TypedRule<TDefinition = Record<string, unknown>> {
  /** The immutable version record (INSERT-only entity). */
  ruleVersion: Readonly<CommercialRuleVersionEntity>;
  /** Strongly-typed definition extracted from ruleVersion.definition. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  definition: Readonly<TDefinition>;
  ruleType: CommercialRuleType;
}

/** Definition shape for PRICING rules */
export interface PricingRuleDefinition {
  /** Base price in minor currency units (INT). */
  basePriceMinor: number;
  currency: string;
  /** Optional billing cycle: monthly | annual | one_time */
  billingCycle?: string;
  /** Optional per-unit pricing for usage-based products */
  unitPriceMinor?: number;
  /** Tier breakpoints for tiered pricing [{upToUnits, priceMinor}] */
  tiers?: Array<{ upToUnits: number | null; priceMinor: number }>;
  metadata?: Record<string, unknown>;
}

/** Definition shape for DISCOUNT rules */
export interface DiscountRuleDefinition {
  /** Discount in basis points (100 = 1%). INT only. */
  discountBps: number;
  /** Maximum discount amount in minor units. -1 = uncapped. */
  maxDiscountMinor: number;
  /** ISO date after which the discount is no longer valid. */
  validUntil?: string;
  applicableProductSkus?: string[];
  metadata?: Record<string, unknown>;
}

/** Definition shape for PROMOTION rules */
export interface PromotionRuleDefinition {
  promotionCode?: string;
  /** Discount in basis points (INT). */
  discountBps: number;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
  applicableProductSkus?: string[];
  metadata?: Record<string, unknown>;
}

/** Definition shape for TRIAL rules */
export interface TrialRuleDefinition {
  /** Number of trial days. */
  trialDays: number;
  /** Price during trial in minor units. 0 = free trial. */
  trialPriceMinor: number;
  currency: string;
  /** Whether to require payment method upfront. */
  requiresPaymentMethod: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * TAX rule — reference only.
 * Tax calculation is performed by the Finance Engine (booking-service).
 * The Commercial Engine carries a reference to the applicable tax rule
 * for downstream use — it does not evaluate tax amounts.
 */
export interface TaxRuleDefinition {
  taxCode: string;
  /** e.g. 'GST', 'VAT', 'SALES_TAX' */
  taxType: string;
  /** Rate in basis points (e.g. 1800 = 18% GST). INT only. */
  rateBps: number;
  applicableCountries?: string[];
  metadata?: Record<string, unknown>;
}

// Typed rule types
export type PricingRule    = TypedRule<PricingRuleDefinition>;
export type DiscountRule   = TypedRule<DiscountRuleDefinition>;
export type PromotionRule  = TypedRule<PromotionRuleDefinition>;
export type TrialRule      = TypedRule<TrialRuleDefinition>;
export type TaxRule        = TypedRule<TaxRuleDefinition>;

// ── EvaluatedRule ─────────────────────────────────────────────────────────────

/** Result of evaluating a single rule version. */
export interface EvaluatedRule<TDefinition = Record<string, unknown>> {
  ruleVersion: Readonly<CommercialRuleVersionEntity>;
  ruleType: CommercialRuleType;
  outcome: RuleEvaluationOutcome;
  /** Human-readable evaluation summary. */
  reason: string;
  /** The typed definition that was evaluated. */
  definition: Readonly<TDefinition>;
}

// ── RuleBundle ────────────────────────────────────────────────────────────────

/**
 * Deterministically ordered, typed rule bundle produced by IRuleResolver.
 *
 * All rule arrays contain only ACTIVE rules with a pinned version.
 * They are read-only; no mutations occur after bundle creation.
 *
 * Evaluation order within the pipeline:
 *   pricingRules → discountRules → promotionRules → trialRules
 *   → [taxRules reference only] → evaluatedRules (result log)
 */
export interface RuleBundle {
  pricingRules:    ReadonlyArray<PricingRule>;
  discountRules:   ReadonlyArray<DiscountRule>;
  promotionRules:  ReadonlyArray<PromotionRule>;
  trialRules:      ReadonlyArray<TrialRule>;
  /** Reference only — not evaluated in this service. */
  taxRules:        ReadonlyArray<TaxRule>;
  /** Evaluation trace — one entry per evaluated rule. */
  evaluatedRules:  ReadonlyArray<EvaluatedRule>;
  /**
   * The primary rule ID for this decision — the first PRICING rule,
   * or the first rule of any type, or null when no rules exist.
   * Used to populate CommercialDecisionSnapshotEntity.ruleId.
   * Never a sentinel UUID.
   */
  primaryRuleVersionId:   string | null;
  primaryRuleVersionSemver: string | null;
  resolvedAt: Date;
}

// ── IRuleResolver ─────────────────────────────────────────────────────────────

/**
 * Contract for the Commercial Rule Engine.
 *
 * Resolves a typed RuleBundle from a flat list of CommercialRuleVersionEntity
 * records (already loaded by DefaultPolicyResolver).
 *
 * Constraints:
 *   - Reads ONLY from CommercialRuleVersionEntity.definition (immutable).
 *   - Never reads CommercialRuleEntity at evaluation time (mutable).
 *   - Evaluation order is deterministic (see enum above).
 *   - Unknown rule types are logged and skipped — never throw.
 *   - TAX rules are classified but not evaluated.
 */
export interface IRuleResolver {
  /**
   * Builds and evaluates a RuleBundle from the given version entities.
   * @param ruleVersions Pre-loaded immutable rule versions from DefaultPolicyResolver.
   */
  resolve(
    ruleVersions: ReadonlyArray<Readonly<CommercialRuleVersionEntity>>,
  ): RuleBundle;
}

export const RULE_RESOLVER = Symbol('IRuleResolver');
