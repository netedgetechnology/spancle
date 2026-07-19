/**
 * finance.commands.ts
 *
 * Finance internal commands produced by the Platform Contract Intake ACL.
 *
 * Commands are the Finance domain's view of what needs to happen.
 * They contain ONLY Finance terminology — no Commercial concepts.
 *
 * Immutability: all fields are readonly. Commands are frozen at construction.
 * No methods. No class decorators. Pure data.
 *
 * Origin: produced by PlatformContractMapper from validated platform envelopes.
 * Consumer: Finance application services (not yet implemented).
 */

// ── CreateFinancialTransactionCommand ─────────────────────────────────────────

export type FinancialTransactionSourceType = 'platform_contract' | 'manual' | 'system';

export interface CreateFinancialTransactionCommand {
  readonly kind:              'CreateFinancialTransactionCommand';
  /** Finance-domain tenant identifier. */
  readonly tenantId:          string;
  /** Type of financial activity, e.g. 'COMMERCIAL_DECISION'. */
  readonly transactionType:   string;
  /** Total transaction amount in minor currency units (INT). */
  readonly amountMinor:       number;
  readonly currency:          string;
  /**
   * Stable external reference for idempotency.
   * Format: platform-contract-{deduplicationKey}
   */
  readonly idempotencyKey:    string;
  /** Where this transaction originated. */
  readonly sourceType:        FinancialTransactionSourceType;
  /** Opaque ID in the originating system (e.g. platform envelopeId). */
  readonly sourceReference:   string;
  /** ISO-4217 country code. */
  readonly country:           string;
  /** YYYY-MM accounting period to post into. */
  readonly accountingPeriod:  string;
  readonly description:       string;
  readonly requestedAt:       string;   // ISO-8601
}

// ── CreatePaymentCommand ──────────────────────────────────────────────────────

export interface CreatePaymentCommand {
  readonly kind:                'CreatePaymentCommand';
  readonly tenantId:            string;
  readonly amountMinor:         number;
  readonly currency:            string;
  readonly idempotencyKey:      string;
  /**
   * Preferred gateway type hint from the platform instruction.
   * Finance applies its own gateway selection — this is advisory only.
   */
  readonly preferredGatewayHint: string | null;
  readonly billingCycle:        string | null;
  readonly isTrial:             boolean;
  readonly trialDays:           number | null;
  readonly trialAmountMinor:    number | null;
  /** Discount already applied at source in minor units. Finance records only. */
  readonly appliedDiscountMinor: number;
  /** Tax code Finance must use to compute and apply tax. */
  readonly taxCode:             string | null;
  readonly sourceReference:     string;
}

// ── CreateInvoiceCommand ──────────────────────────────────────────────────────

export interface InvoiceLineCommand {
  readonly description:    string;
  readonly lineType:       string;
  readonly quantity:       number;
  readonly unitPriceMinor: number;
  readonly subtotalMinor:  number;
  readonly discountMinor:  number;
  readonly taxCode:        string | null;
}

export interface CreateInvoiceCommand {
  readonly kind:           'CreateInvoiceCommand';
  readonly tenantId:       string;
  readonly currency:       string;
  readonly idempotencyKey: string;
  readonly lines:          ReadonlyArray<InvoiceLineCommand>;
  readonly subtotalMinor:  number;
  readonly discountMinor:  number;
  /** taxMinor is 0 — Finance computes it using its own TaxResolver. */
  readonly taxMinor:       0;
  readonly totalMinor:     number;
  readonly sourceReference: string;
  /** Metadata for audit trail. */
  readonly packageLabel:   string | null;   // e.g. "starter v1"
  readonly planId:         string | null;
}

// ── CreateSettlementCommand ───────────────────────────────────────────────────

export type SettlementOwnership = 'PLATFORM' | 'TENANT' | 'SPLIT';

export interface CreateSettlementCommand {
  readonly kind:                   'CreateSettlementCommand';
  readonly tenantId:               string;
  readonly currency:               string;
  readonly idempotencyKey:         string;
  readonly ownershipType:          SettlementOwnership;
  /** Platform fee in basis points (INT). */
  readonly platformFeeBps:         number;
  readonly settlementDelaySeconds: number;
  readonly holdInEscrow:           boolean;
  readonly sourceReference:        string;
}

// ── CreateRevenueDistributionCommand ─────────────────────────────────────────

export interface RevenueTierCommand {
  readonly upToMinor: number | null;
  readonly rateBps:   number;
}

export interface CreateRevenueDistributionCommand {
  readonly kind:                        'CreateRevenueDistributionCommand';
  readonly tenantId:                    string;
  readonly currency:                    string;
  readonly idempotencyKey:              string;
  readonly distributionType:            string;
  readonly tiers:                       ReadonlyArray<RevenueTierCommand>;
  readonly transactionAmountMinor:      number;
  readonly estimatedPlatformAmountMinor: number;
  readonly sourceReference:             string;
}

// ── FinanceCommandBatch ───────────────────────────────────────────────────────

/**
 * All Finance commands derived from a single platform contract envelope.
 * Commands may be null when the platform instruction was absent or the
 * contract outcome was DENIED.
 *
 * The consumer (Finance application layer) executes these commands in order:
 *   1. CreateFinancialTransactionCommand (always present when accepted)
 *   2. CreateInvoiceCommand (null when outcome=DENIED)
 *   3. CreatePaymentCommand (null when outcome=DENIED)
 *   4. CreateSettlementCommand (always present — settlement terms needed regardless)
 *   5. CreateRevenueDistributionCommand (null when no distribution policy)
 */
export interface FinanceCommandBatch {
  readonly envelopeId:            string;
  readonly deduplicationKey:      string;
  readonly correlationId:         string;
  readonly transaction:           Readonly<CreateFinancialTransactionCommand>;
  readonly invoice:               Readonly<CreateInvoiceCommand> | null;
  readonly payment:               Readonly<CreatePaymentCommand> | null;
  readonly settlement:            Readonly<CreateSettlementCommand>;
  readonly revenueDistribution:   Readonly<CreateRevenueDistributionCommand> | null;
  readonly mappedAt:              string;   // ISO-8601
}
