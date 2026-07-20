/**
 * distribution-allocation.value-object.ts
 *
 * DistributionAllocation — immutable value object representing a single
 * recipient's share of a revenue distribution.
 *
 * All monetary values: integer minor currency units. No DECIMAL.
 * Rates: integer basis points (100 bps = 1%). FixedAmount: bps = 0.
 *
 * Balance rule (enforced by RevenueDistribution aggregate):
 *   ∑ amountMinor for all allocations must equal sourceAmountMinor.
 */

// ── RecipientType ─────────────────────────────────────────────────────────────

export const RecipientTypes = [
  'COACH',
  'ACADEMY',
  'VENUE',
  'FRANCHISE',
  'PLATFORM',
  'VENDOR',
  'OTHER',
] as const;

export type RecipientType = typeof RecipientTypes[number];

export function isRecipientType(v: string): v is RecipientType {
  return (RecipientTypes as readonly string[]).includes(v);
}

// ── AllocationType ────────────────────────────────────────────────────────────

export const AllocationTypes = ['FIXED_AMOUNT', 'PERCENTAGE'] as const;
export type AllocationType = typeof AllocationTypes[number];

// ── DistributionAllocationProps ───────────────────────────────────────────────

export interface DistributionAllocationProps {
  readonly allocationId:    string;
  readonly recipientType:   RecipientType;
  /** Domain ID of the recipient (tenantId, coachId, etc.). */
  readonly recipientId:     string;
  readonly allocationType:  AllocationType;
  /**
   * Basis points when allocationType = PERCENTAGE (0–10000).
   * 0 when allocationType = FIXED_AMOUNT.
   */
  readonly rateBps:         number;
  /** Resolved amount in minor currency units. Must be > 0. */
  readonly amountMinor:     number;
  readonly currency:        string;
  readonly description:     string;
}

// ── DistributionAllocation ────────────────────────────────────────────────────

export class DistributionAllocation {
  private readonly _props: Readonly<DistributionAllocationProps>;

  private constructor(props: DistributionAllocationProps) {
    DistributionAllocation.validate(props);
    this._props = Object.freeze({ ...props });
  }

  static createFixed(
    allocationId:  string,
    recipientType: RecipientType,
    recipientId:   string,
    amountMinor:   number,
    currency:      string,
    description:   string,
  ): DistributionAllocation {
    return new DistributionAllocation({
      allocationId, recipientType, recipientId,
      allocationType: 'FIXED_AMOUNT',
      rateBps:        0,
      amountMinor, currency, description,
    });
  }

  static createPercentage(
    allocationId:  string,
    recipientType: RecipientType,
    recipientId:   string,
    rateBps:       number,
    amountMinor:   number,     // pre-computed from rate × source
    currency:      string,
    description:   string,
  ): DistributionAllocation {
    return new DistributionAllocation({
      allocationId, recipientType, recipientId,
      allocationType: 'PERCENTAGE',
      rateBps, amountMinor, currency, description,
    });
  }

  static reconstitute(props: DistributionAllocationProps): DistributionAllocation {
    return new DistributionAllocation(props);
  }

  get allocationId():   string           { return this._props.allocationId; }
  get recipientType():  RecipientType    { return this._props.recipientType; }
  get recipientId():    string           { return this._props.recipientId; }
  get allocationType(): AllocationType   { return this._props.allocationType; }
  get rateBps():        number           { return this._props.rateBps; }
  get amountMinor():    number           { return this._props.amountMinor; }
  get currency():       string           { return this._props.currency; }
  get description():    string           { return this._props.description; }
  get isPercentage():   boolean          { return this._props.allocationType === 'PERCENTAGE'; }
  get isFixed():        boolean          { return this._props.allocationType === 'FIXED_AMOUNT'; }

  toJSON(): Readonly<DistributionAllocationProps> {
    return { ...this._props };
  }

  private static validate(p: DistributionAllocationProps): void {
    if (!p.allocationId)    throw new Error('DistributionAllocation: allocationId required');
    if (!p.recipientId)     throw new Error('DistributionAllocation: recipientId required');
    if (!p.description?.trim()) throw new Error('DistributionAllocation: description required');
    if (!p.currency || p.currency.length !== 3)
      throw new Error(`DistributionAllocation: currency must be 3-char ISO-4217; got "${p.currency}"`);
    if (!Number.isInteger(p.amountMinor) || p.amountMinor <= 0)
      throw new Error(`DistributionAllocation: amountMinor must be a positive integer; got ${p.amountMinor}`);
    if (p.allocationType === 'PERCENTAGE') {
      if (!Number.isInteger(p.rateBps) || p.rateBps <= 0 || p.rateBps > 10000)
        throw new Error(`DistributionAllocation: rateBps must be 1–10000 for PERCENTAGE; got ${p.rateBps}`);
    }
    if (p.allocationType === 'FIXED_AMOUNT' && p.rateBps !== 0)
      throw new Error('DistributionAllocation: rateBps must be 0 for FIXED_AMOUNT');
    if (!isRecipientType(p.recipientType))
      throw new Error(`DistributionAllocation: unknown recipientType "${p.recipientType}"`);
  }
}
