/**
 * commercial-decision.contract.ts
 *
 * Frozen, versioned, serializable representation of a CommercialDecisionResult.
 *
 * This is the PUBLIC CONTRACT between the Commercial Engine (producer)
 * and the Finance Engine (consumer). Once published in a DECISION_GENERATED
 * event, this shape MUST remain backward-compatible within the same major version.
 *
 * Rules:
 *   - All fields are readonly.
 *   - No methods, no decorators.
 *   - No imports from booking-service or Finance modules.
 *   - Dates are serialized as ISO-8601 strings.
 *   - Money is always INT minor currency units.
 *   - Rates are always basis points (INT).
 *
 * The CommercialDecisionResult interface (internal) references TypeORM entities.
 * This contract contains only plain scalar/object fields — safe to JSON.stringify.
 */
import type { VersionedContract } from './contract-version';
import type {
  PaymentInstruction,
  InvoiceInstruction,
  SettlementInstruction,
  RevenueInstruction,
} from './financial-instructions.contracts';

// ── EvaluatedRuleRef ──────────────────────────────────────────────────────────

/** Reference to a rule version that participated in this decision. */
export interface EvaluatedRuleRef {
  readonly ruleVersionId:    string;
  readonly ruleType:         string;
  readonly outcome:          string;
  readonly reason:           string;
}

// ── CommercialDecisionContract ────────────────────────────────────────────────

/**
 * The frozen public contract emitted in DECISION_GENERATED.
 *
 * Finance receives this as the event payload and uses it to:
 *   1. Draft an invoice (InvoiceInstruction)
 *   2. Initiate a payment (PaymentInstruction)
 *   3. Apply revenue split (RevenueInstruction)
 *   4. Record settlement terms (SettlementInstruction)
 *
 * Finance MUST validate contractVersion before processing.
 * Finance MUST NOT assume fields added in future minor versions exist
 * — use optional chaining when reading non-v1.0.0 fields.
 */
export interface CommercialDecisionContract extends VersionedContract {
  readonly kind: 'CommercialDecisionContract';

  // ── Core decision identity ─────────────────────────────────────────────

  /** Unique snapshot ID. Finance uses this as the canonical decision reference. */
  readonly decisionId:    string;
  readonly tenantId:      string;
  readonly moduleId:      string;
  readonly productId:     string;
  readonly transactionType: string;

  /** 'ALLOWED' | 'DENIED' | 'MODIFIED' | 'PENDING' */
  readonly outcome:       string;
  readonly reason:        string;
  readonly productEligible: boolean;

  // ── Package assignment snapshot ────────────────────────────────────────

  readonly planId:         string | null;
  readonly packageId:      string | null;
  readonly packageSlug:    string | null;
  readonly packageVersion: string | null;
  readonly tierKey:        string | null;

  // ── Rule evaluation trace ──────────────────────────────────────────────

  readonly primaryRuleVersionId:     string | null;
  readonly primaryRuleVersionSemver: string | null;
  readonly evaluatedRules:           ReadonlyArray<EvaluatedRuleRef>;

  // ── Applied policy IDs ─────────────────────────────────────────────────

  readonly appliedPolicyIds: ReadonlyArray<string>;

  // ── Gateway selection ──────────────────────────────────────────────────

  readonly preferredGatewayType: string | null;

  // ── Financial instructions ─────────────────────────────────────────────

  /**
   * Payment collection instruction.
   * Null when the decision outcome is DENIED.
   */
  readonly paymentInstruction: PaymentInstruction | null;

  /**
   * Invoice drafting instruction.
   * Null when the decision outcome is DENIED.
   */
  readonly invoiceInstruction: InvoiceInstruction | null;

  /**
   * Settlement timing and ownership instruction.
   * Always present — Finance needs settlement terms regardless of outcome.
   */
  readonly settlementInstruction: SettlementInstruction;

  /**
   * Revenue distribution instruction.
   * Null when no distribution policy exists (platform takes 100%).
   */
  readonly revenueInstruction: RevenueInstruction | null;

  // ── Context snapshot ───────────────────────────────────────────────────

  readonly requestedAmountMinor: number;
  readonly currency:             string;
  readonly country:              string;
  readonly requestedAt:          string;  // ISO-8601
}
