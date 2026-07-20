/**
 * invoice-line.value-object.ts
 *
 * InvoiceLine — immutable value object representing one line on an invoice.
 *
 * All monetary values: integer minor currency units (INT only).
 * All rates: integer basis points (100 bps = 1%).
 *
 * lineTotal = (quantity × unitPriceMinor) - discountMinor
 *
 * Tax storage:
 *   taxRateBps is stored but NOT applied here.
 *   Tax computation belongs to the TaxResolver (deferred).
 *   The invoice aggregate stores the tax total separately after resolution.
 */

export interface InvoiceLineProps {
  readonly lineId:         string;
  readonly description:    string;
  /** Integer count (no fractional quantities). */
  readonly quantity:       number;
  /** Price per unit in minor currency units. INT only. */
  readonly unitPriceMinor: number;
  /** Discount on this line in minor currency units. INT only. 0 = no discount. */
  readonly discountMinor:  number;
  /** Tax rate in basis points (e.g. 1800 = 18% GST). 0 = untaxed. */
  readonly taxRateBps:     number;
}

export class InvoiceLine {
  private readonly _props: Readonly<InvoiceLineProps>;

  private constructor(props: InvoiceLineProps) {
    InvoiceLine.validate(props);
    this._props = Object.freeze({ ...props });
  }

  static create(props: InvoiceLineProps): InvoiceLine {
    return new InvoiceLine(props);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  get lineId():         string { return this._props.lineId; }
  get description():    string { return this._props.description; }
  get quantity():       number { return this._props.quantity; }
  get unitPriceMinor(): number { return this._props.unitPriceMinor; }
  get discountMinor():  number { return this._props.discountMinor; }
  get taxRateBps():     number { return this._props.taxRateBps; }

  /** subtotal before discount: quantity × unitPriceMinor */
  get grossMinor(): number {
    return this._props.quantity * this._props.unitPriceMinor;
  }

  /**
   * lineTotal = (quantity × unitPriceMinor) - discountMinor.
   * This is the taxable base for this line. Tax is not applied here.
   */
  get lineTotal(): number {
    return this.grossMinor - this._props.discountMinor;
  }

  /**
   * Tax amount for this line (informational, from stored rate).
   * Finance TaxResolver is responsible for authoritative tax computation.
   * Floor division: 10000 bps = 100%.
   */
  get lineTaxMinor(): number {
    return Math.floor((this.lineTotal * this._props.taxRateBps) / 10000);
  }

  // ── Mutation (returns new instance) ───────────────────────────────────────

  withQuantity(quantity: number): InvoiceLine {
    return new InvoiceLine({ ...this._props, quantity });
  }

  withUnitPrice(unitPriceMinor: number): InvoiceLine {
    return new InvoiceLine({ ...this._props, unitPriceMinor });
  }

  withDiscount(discountMinor: number): InvoiceLine {
    return new InvoiceLine({ ...this._props, discountMinor });
  }

  toJSON(): InvoiceLineProps & { grossMinor: number; lineTotal: number; lineTaxMinor: number } {
    return {
      ...this._props,
      grossMinor:   this.grossMinor,
      lineTotal:    this.lineTotal,
      lineTaxMinor: this.lineTaxMinor,
    };
  }

  // ── Validation ────────────────────────────────────────────────────────────

  private static validate(p: InvoiceLineProps): void {
    if (!p.lineId)            throw new Error('InvoiceLine: lineId is required');
    if (!p.description?.trim()) throw new Error('InvoiceLine: description is required');
    if (!Number.isInteger(p.quantity) || p.quantity <= 0)
      throw new Error(`InvoiceLine: quantity must be a positive integer; received ${p.quantity}`);
    if (!Number.isInteger(p.unitPriceMinor) || p.unitPriceMinor < 0)
      throw new Error(`InvoiceLine: unitPriceMinor must be a non-negative integer; received ${p.unitPriceMinor}`);
    if (!Number.isInteger(p.discountMinor) || p.discountMinor < 0)
      throw new Error(`InvoiceLine: discountMinor must be a non-negative integer; received ${p.discountMinor}`);
    if (!Number.isInteger(p.taxRateBps) || p.taxRateBps < 0 || p.taxRateBps > 100_00)
      throw new Error(`InvoiceLine: taxRateBps must be 0–10000; received ${p.taxRateBps}`);
    if (p.discountMinor > p.quantity * p.unitPriceMinor)
      throw new Error(`InvoiceLine: discountMinor ${p.discountMinor} exceeds gross ${p.quantity * p.unitPriceMinor}`);
  }
}
