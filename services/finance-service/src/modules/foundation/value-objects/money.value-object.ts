/**
 * money.value-object.ts
 *
 * Immutable Money value object.
 *
 * ALL amounts are stored and operated on as integer minor currency units.
 * NEVER uses floating-point arithmetic. NEVER stores DECIMAL.
 *
 * Arithmetic rules:
 *   - add/subtract: same currency only
 *   - multiply: by an integer scale factor (e.g. quantity)
 *   - applyBps: applies a basis-point rate (INT) using integer arithmetic
 *   - divide: rounds DOWN to the nearest integer minor unit
 *
 * Design:
 *   Money is a value object — equality is by value (amountMinor + currency code).
 *   All operations return new Money instances. No mutation.
 *
 * Money.ZERO(currency) is the additive identity element.
 */
import { Currency } from './currency.value-object';

export class Money {
  private readonly _amountMinor: number;
  private readonly _currency:    Currency;

  private constructor(amountMinor: number, currency: Currency) {
    if (!Number.isInteger(amountMinor)) {
      throw new Error(`Money amount must be an integer minor-unit value; received ${amountMinor}`);
    }
    this._amountMinor = amountMinor;
    this._currency    = currency;
  }

  // ── Factory methods ───────────────────────────────────────────────────────

  static of(amountMinor: number, currencyCode: string): Money {
    return new Money(amountMinor, Currency.of(currencyCode));
  }

  static ofCurrency(amountMinor: number, currency: Currency): Money {
    return new Money(amountMinor, currency);
  }

  static ZERO(currencyCode: string): Money {
    return new Money(0, Currency.of(currencyCode));
  }

  static ZERO_OF(currency: Currency): Money {
    return new Money(0, currency);
  }

  // ── Properties ────────────────────────────────────────────────────────────

  get amountMinor(): number { return this._amountMinor; }
  get currency():    Currency { return this._currency; }
  get currencyCode(): string  { return this._currency.code; }

  isZero():     boolean { return this._amountMinor === 0; }
  isPositive(): boolean { return this._amountMinor > 0; }
  isNegative(): boolean { return this._amountMinor < 0; }

  // ── Arithmetic ────────────────────────────────────────────────────────────

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amountMinor + other._amountMinor, this._currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this._amountMinor - other._amountMinor, this._currency);
  }

  /**
   * Multiplies by an integer factor (e.g. quantity).
   * Throws if factor is not an integer.
   */
  multiplyByInt(factor: number): Money {
    if (!Number.isInteger(factor)) {
      throw new Error(`multiply factor must be an integer; received ${factor}`);
    }
    return new Money(this._amountMinor * factor, this._currency);
  }

  /**
   * Applies a basis-point rate to this amount.
   * Result is floored to the nearest integer minor unit.
   *
   * Example: Money.of(10000, 'GBP').applyBps(2000) → Money.of(2000, 'GBP')  (20% of £100)
   *
   * @param rateBps Integer basis points. 100 bps = 1%.
   */
  applyBps(rateBps: number): Money {
    if (!Number.isInteger(rateBps) || rateBps < 0) {
      throw new Error(`rateBps must be a non-negative integer; received ${rateBps}`);
    }
    return new Money(Math.floor((this._amountMinor * rateBps) / 10000), this._currency);
  }

  /**
   * Divides by an integer divisor, rounding DOWN (floor division).
   * Remainder is always discarded — callers handle it explicitly.
   */
  divideByInt(divisor: number): Money {
    if (!Number.isInteger(divisor) || divisor <= 0) {
      throw new Error(`divisor must be a positive integer; received ${divisor}`);
    }
    return new Money(Math.floor(this._amountMinor / divisor), this._currency);
  }

  /**
   * Returns the absolute value of this amount.
   */
  abs(): Money {
    return new Money(Math.abs(this._amountMinor), this._currency);
  }

  /**
   * Negates this amount.
   */
  negate(): Money {
    return new Money(-this._amountMinor, this._currency);
  }

  // ── Comparison ────────────────────────────────────────────────────────────

  equals(other: Money): boolean {
    return this._amountMinor === other._amountMinor && this._currency.equals(other._currency);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amountMinor > other._amountMinor;
  }

  greaterThanOrEqual(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amountMinor >= other._amountMinor;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this._amountMinor < other._amountMinor;
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON(): { amountMinor: number; currency: string } {
    return { amountMinor: this._amountMinor, currency: this._currency.code };
  }

  toString(): string {
    return `${this._amountMinor} ${this._currency.code}`;
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  /**
   * Sums an array of Money values. All must share the same currency.
   * Returns ZERO in that currency when the array is empty (currency required).
   */
  static sum(amounts: Money[], currency: string): Money {
    if (amounts.length === 0) return Money.ZERO(currency);
    return amounts.reduce((acc, m) => acc.add(m), Money.ZERO(currency));
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private assertSameCurrency(other: Money): void {
    if (!this._currency.equals(other._currency)) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this._currency.code} and ${other._currency.code}`,
      );
    }
  }
}
