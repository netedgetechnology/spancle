/**
 * financial-instructions.contracts.ts
 *
 * Immutable instruction contracts produced by the Commercial Engine for
 * consumption by the Finance Engine.
 *
 * ALL monetary values are integer minor currency units (INT only).
 * Basis points (bps) represent rates: 100 bps = 1%.
 *
 * These interfaces are pure data — no class methods, no decorators.
 * They are serialized into the DECISION_GENERATED event payload and
 * deserialized by Finance from the event body.
 *
 * NO imports from booking-service or Finance modules.
 * Commercial remains Finance-independent.
 */
import type { VersionedContract } from './contract-version';

// ── PaymentInstruction ────────────────────────────────────────────────────────

/**
 * Instructs Finance on how to collect payment for this decision.
 *
 * Finance MUST NOT execute payment based on this instruction alone —
 * it is informational. Finance's own payment validation applies.
 *
 * Derived from:
 *   - PricingRule.basePriceMinor + billingCycle
 *   - GatewayBundle.primary.definition.gatewayType
 *   - PackageAssignment.tierKey (for idempotency key construction)
 */
export interface PaymentInstruction extends VersionedContract {
  readonly kind: 'PaymentInstruction';

  /** Tenant to collect from. */
  readonly tenantId: string;

  /** Amount to collect in minor currency units. INT only. */
  readonly amountMinor: number;

  /** ISO 4217 currency code. */
  readonly currency: string;

  /**
   * Preferred gateway type for this payment.
   * Finance selects the actual credential — this is a preference, not a mandate.
   */
  readonly preferredGatewayType: string | null;

  /**
   * Billing cycle: 'monthly' | 'annual' | 'one_time' | 'custom'
   * Null when no pricing rule resolved a billing cycle.
   */
  readonly billingCycle: string | null;

  /**
   * Caller idempotency key for payment deduplication.
   * Format: commercial-payment-{decisionId}
   * Finance uses this to prevent duplicate payment initiation.
   */
  readonly idempotencyKey: string;

  /**
   * Whether this is a trial period payment.
   * When true, trialDays and trialPriceMinor carry the trial terms.
   */
  readonly isTrial: boolean;
  readonly trialDays: number | null;
  readonly trialPriceMinor: number | null;

  /** Applied discount in basis points. 0 when no discount applies. INT only. */
  readonly discountBps: number;

  /** Maximum discount cap in minor units. -1 = uncapped. */
  readonly maxDiscountMinor: number;

  /** Promotion code applied, if any. */
  readonly promotionCode: string | null;

  /** Tax reference code (for Finance to apply the correct rate). */
  readonly taxCode: string | null;
  readonly taxRateBps: number | null;
}

// ── InvoiceInstruction ────────────────────────────────────────────────────────

/**
 * Instructs Finance on how to structure the invoice for this decision.
 *
 * Line items mirror the Finance InvoiceLineDraftDto shape so Finance
 * can draft the invoice without transformation.
 *
 * Finance is responsible for applying tax calculations using its own
 * TaxResolver — the Commercial Engine provides only the tax reference.
 */
export interface InvoiceLine {
  readonly description:     string;
  readonly lineType:        string;
  readonly quantity:        number;
  /** Unit price in minor currency units. INT only. */
  readonly unitPriceMinor:  number;
  /** Pre-computed subtotal (quantity × unitPriceMinor). */
  readonly subtotalMinor:   number;
  /** Discount applied to this line in minor units. */
  readonly discountMinor:   number;
  /** Tax code for this line (Finance applies the rate). */
  readonly taxCode:         string | null;
}

export interface InvoiceInstruction extends VersionedContract {
  readonly kind: 'InvoiceInstruction';

  readonly tenantId:   string;
  readonly currency:   string;

  /**
   * Source identifiers — Finance uses these to correlate the invoice
   * with the originating Commercial Decision.
   */
  readonly sourceType: string;
  readonly sourceId:   string;

  /** Invoice line items derived from the resolved pricing rules. */
  readonly lines: ReadonlyArray<InvoiceLine>;

  /** Pre-computed totals in minor currency units. INT only. */
  readonly subtotalMinor:  number;
  readonly discountMinor:  number;
  /** Tax total is 0 here — Finance computes it using TaxResolver. */
  readonly taxMinor:       0;
  readonly totalMinor:     number;

  /** Package metadata for Finance audit trail. */
  readonly packageSlug:    string | null;
  readonly packageVersion: string | null;
  readonly planId:         string | null;
  readonly tierKey:        string | null;

  /**
   * Caller idempotency key.
   * Format: commercial-invoice-{decisionId}
   */
  readonly idempotencyKey: string;
}

// ── SettlementInstruction ─────────────────────────────────────────────────────

/**
 * Instructs Finance on timing and conditions for fund settlement.
 *
 * Settlement timing is determined by the PaymentOwnershipPolicy:
 *   PLATFORM: funds settle to platform immediately
 *   TENANT: funds settle to tenant after platform fee is deducted
 *   SPLIT: funds split per distribution policy
 */
export interface SettlementInstruction extends VersionedContract {
  readonly kind: 'SettlementInstruction';

  readonly tenantId:     string;

  /**
   * Who receives the settled funds.
   * 'PLATFORM' | 'TENANT' | 'SPLIT'
   */
  readonly ownershipType: string;

  /**
   * Platform fee in basis points. 0 for TENANT-owned context.
   * INT only.
   */
  readonly platformFeeBps: number;

  /**
   * Settlement delay in seconds after payment capture.
   * 0 = immediate. Positive = deferred.
   */
  readonly settlementDelaySeconds: number;

  /**
   * Whether funds should be held in escrow pending manual release.
   * False for standard settlement flows.
   */
  readonly holdInEscrow: boolean;

  readonly currency: string;
}

// ── RevenueInstruction ────────────────────────────────────────────────────────

/**
 * Instructs Finance on how to split revenue between platform and tenant.
 *
 * Derived from RevenueDistributionPolicyEntity.tiers.
 * Finance applies these tiers to the settled amount to determine
 * the exact split amounts.
 *
 * All rate values are basis points (INT). No DECIMAL/FLOAT.
 */
export interface RevenueTier {
  /**
   * Upper bound for this tier in minor currency units.
   * Null = no upper bound (applies to all amounts above previous tier).
   */
  readonly upToMinor:   number | null;
  /** Platform share in basis points. 100 bps = 1%. INT only. */
  readonly rateBps:     number;
}

export interface RevenueInstruction extends VersionedContract {
  readonly kind: 'RevenueInstruction';

  readonly tenantId:           string;
  readonly distributionType:   string;
  readonly tiers:              ReadonlyArray<RevenueTier>;
  readonly currency:           string;

  /**
   * Pre-computed platform amount for the decision's transaction amount.
   * Finance verifies this independently. INT minor units.
   */
  readonly estimatedPlatformAmountMinor: number;

  /** Transaction amount this instruction was computed against. */
  readonly transactionAmountMinor: number;
}
