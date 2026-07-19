/**
 * currency.value-object.ts
 *
 * Immutable ISO-4217 currency value object.
 *
 * Validates that a currency code is a known, supported 3-letter ISO-4217 code.
 * Does NOT perform exchange rate lookups. Does NOT store rates.
 *
 * Finance operations must use a single currency per transaction.
 * Cross-currency conversion is out of scope for this foundation batch.
 */

/** Supported ISO-4217 currency codes (extend as needed). */
const SUPPORTED_CURRENCIES = new Set([
  'GBP', 'USD', 'EUR', 'INR', 'AED', 'SGD', 'AUD', 'CAD',
  'ZAR', 'MYR', 'NPR', 'LKR', 'BDT', 'PKR',
]);

/** Minor-unit scale factor per currency (how many minor units in one major unit). */
const MINOR_UNIT_SCALE: Record<string, number> = {
  GBP: 100, USD: 100, EUR: 100, INR: 100, AED: 100,
  SGD: 100, AUD: 100, CAD: 100, ZAR: 100, MYR: 100,
  NPR: 100, LKR: 100, BDT: 100, PKR: 100,
};

export class Currency {
  private readonly _code: string;

  private constructor(code: string) {
    this._code = code;
  }

  static of(code: string): Currency {
    const upper = code.trim().toUpperCase();
    if (upper.length !== 3) {
      throw new Error(`Currency code must be exactly 3 characters; received "${code}"`);
    }
    if (!SUPPORTED_CURRENCIES.has(upper)) {
      throw new Error(`Unsupported currency "${upper}". Supported: ${[...SUPPORTED_CURRENCIES].join(', ')}`);
    }
    return new Currency(upper);
  }

  /** Returns the 3-letter ISO-4217 uppercase code. */
  get code(): string { return this._code; }

  /**
   * Returns the number of minor units per major unit.
   * e.g. GBP → 100 (100 pence = £1), INR → 100 (100 paise = ₹1)
   */
  get minorUnitScale(): number {
    return MINOR_UNIT_SCALE[this._code] ?? 100;
  }

  equals(other: Currency): boolean {
    return this._code === other._code;
  }

  toString(): string { return this._code; }
  toJSON():   string { return this._code; }

  static isSupported(code: string): boolean {
    return SUPPORTED_CURRENCIES.has(code.trim().toUpperCase());
  }
}
