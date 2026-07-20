/**
 * settlement.aggregate.ts
 *
 * Settlement — Finance domain aggregate representing the commercial record
 * of an invoice being paid.
 *
 * A Settlement tracks HOW MUCH of an invoice has been collected.
 * It does NOT post ledger entries.
 * It does NOT call payment gateway SDKs.
 * It does NOT query the invoice database.
 *
 * Lifecycle:
 *   PENDING → PARTIALLY_SETTLED   (partial payment applied)
 *   PENDING → SETTLED             (full payment applied)
 *   PARTIALLY_SETTLED → SETTLED   (remaining balance paid)
 *   PARTIALLY_SETTLED → CANCELLED
 *   PENDING → CANCELLED
 *   SETTLED → REFUNDED            (full refund)
 *   SETTLED → PARTIALLY_SETTLED   (partial refund — reduces settled amount)
 *
 * Immutability rules:
 *   SETTLED  : can only transition to REFUNDED or back to PARTIALLY_SETTLED.
 *   CANCELLED: terminal — no further transitions.
 *   REFUNDED : terminal — no further transitions.
 *
 * All monetary values: integer minor currency units. No DECIMAL. No FLOAT.
 */
import { PaymentAllocation } from './settlement-payment-method';
import type { SettlementPaymentMethod } from './settlement-payment-method';

// ── SettlementStatus ──────────────────────────────────────────────────────────

export type SettlementStatus =
  | 'PENDING'
  | 'PARTIALLY_SETTLED'
  | 'SETTLED'
  | 'CANCELLED'
  | 'REFUNDED';

const ALLOWED: Record<SettlementStatus, SettlementStatus[]> = {
  PENDING:            ['PARTIALLY_SETTLED', 'SETTLED', 'CANCELLED'],
  PARTIALLY_SETTLED:  ['SETTLED', 'CANCELLED'],
  SETTLED:            ['REFUNDED', 'PARTIALLY_SETTLED'],   // partial refund → back to partial
  CANCELLED:          [],
  REFUNDED:           [],
};

// ── SettlementProps ───────────────────────────────────────────────────────────

export interface SettlementProps {
  readonly settlementId:        string;
  readonly tenantId:            string;
  readonly invoiceId:           string;
  readonly customerId:          string;
  readonly paymentReference:    string;
  readonly paymentMethod:       SettlementPaymentMethod;
  readonly status:              SettlementStatus;
  readonly currency:            string;
  /** Total invoice amount to be settled (from the invoice). INT only. */
  readonly amountMinor:         number;
  /** Amount collected so far. INT only. */
  readonly settledAmountMinor:  number;
  /** Remaining balance = amountMinor − settledAmountMinor. INT only. */
  readonly remainingAmountMinor: number;
  /** ISO-8601 timestamp when fully settled. Null until SETTLED. */
  readonly settledAt:           string | null;
  readonly notes:               string | null;
  readonly version:             number;
  readonly createdAt:           string;
  readonly updatedAt:           string;
}

// ── Settlement aggregate ──────────────────────────────────────────────────────

export class Settlement {
  private readonly _props:       Readonly<SettlementProps>;
  private readonly _allocations: PaymentAllocation[];

  private constructor(props: SettlementProps, allocations: PaymentAllocation[]) {
    Settlement.validateProps(props);
    this._props       = Object.freeze({ ...props });
    this._allocations = allocations;
  }

  // ── Factories ──────────────────────────────────────────────────────────────

  static create(
    props: Omit<SettlementProps, 'status' | 'settledAmountMinor' | 'remainingAmountMinor' |
      'settledAt' | 'version' | 'createdAt' | 'updatedAt'>,
  ): Settlement {
    if (!Number.isInteger(props.amountMinor) || props.amountMinor <= 0) {
      throw new Error(`Settlement.create: amountMinor must be a positive integer; got ${props.amountMinor}`);
    }
    const now = new Date().toISOString();
    return new Settlement({
      ...props,
      status:               'PENDING',
      settledAmountMinor:   0,
      remainingAmountMinor: props.amountMinor,
      settledAt:            null,
      version:              1,
      createdAt:            now,
      updatedAt:            now,
    }, []);
  }

  static reconstitute(props: SettlementProps, allocations: PaymentAllocation[]): Settlement {
    return new Settlement(props, allocations);
  }

  // ── Accessors ──────────────────────────────────────────────────────────────

  get settlementId():         string                  { return this._props.settlementId; }
  get tenantId():             string                  { return this._props.tenantId; }
  get invoiceId():            string                  { return this._props.invoiceId; }
  get customerId():           string                  { return this._props.customerId; }
  get paymentReference():     string                  { return this._props.paymentReference; }
  get paymentMethod():        SettlementPaymentMethod { return this._props.paymentMethod; }
  get status():               SettlementStatus        { return this._props.status; }
  get currency():             string                  { return this._props.currency; }
  get amountMinor():          number                  { return this._props.amountMinor; }
  get settledAmountMinor():   number                  { return this._props.settledAmountMinor; }
  get remainingAmountMinor(): number                  { return this._props.remainingAmountMinor; }
  get settledAt():            string | null           { return this._props.settledAt; }
  get notes():                string | null           { return this._props.notes; }
  get version():              number                  { return this._props.version; }
  get createdAt():            string                  { return this._props.createdAt; }
  get updatedAt():            string                  { return this._props.updatedAt; }
  get allocations():          ReadonlyArray<PaymentAllocation> { return this._allocations; }

  get isPending():           boolean { return this._props.status === 'PENDING'; }
  get isPartiallySettled():  boolean { return this._props.status === 'PARTIALLY_SETTLED'; }
  get isSettled():           boolean { return this._props.status === 'SETTLED'; }
  get isCancelled():         boolean { return this._props.status === 'CANCELLED'; }
  get isRefunded():          boolean { return this._props.status === 'REFUNDED'; }
  get isTerminal():          boolean {
    return this._props.status === 'CANCELLED' || this._props.status === 'REFUNDED';
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  /**
   * Applies a payment amount to this settlement.
   *
   * Rules:
   *   - Cannot apply to CANCELLED or REFUNDED settlement.
   *   - Payment amount must be positive integer.
   *   - Total settled cannot exceed invoice amount.
   *   - Full settlement (remaining === 0) transitions to SETTLED.
   *   - Partial settlement transitions to PARTIALLY_SETTLED.
   *
   * Returns new Settlement instance.
   */
  applyPayment(
    paymentMinor:  number,
    allocation:    PaymentAllocation,
  ): Settlement {
    if (this.isTerminal) {
      throw new Error(`Settlement.applyPayment: cannot modify a ${this._props.status} settlement`);
    }
    if (!Number.isInteger(paymentMinor) || paymentMinor <= 0) {
      throw new Error(`Settlement.applyPayment: paymentMinor must be a positive integer; got ${paymentMinor}`);
    }
    const newSettled = this._props.settledAmountMinor + paymentMinor;
    if (newSettled > this._props.amountMinor) {
      throw new Error(
        `Settlement.applyPayment: overpayment — would settle ${newSettled} against invoice of ${this._props.amountMinor}`,
      );
    }

    const remaining  = this._props.amountMinor - newSettled;
    const nowFull    = remaining === 0;
    const newStatus: SettlementStatus = nowFull ? 'SETTLED' : 'PARTIALLY_SETTLED';
    const now        = new Date().toISOString();

    return new Settlement({
      ...this._props,
      status:               newStatus,
      settledAmountMinor:   newSettled,
      remainingAmountMinor: remaining,
      settledAt:            nowFull ? now : null,
      version:              this._props.version + 1,
      updatedAt:            now,
    }, [...this._allocations, allocation]);
  }

  /**
   * Refunds an amount from a SETTLED settlement.
   *
   * Rules:
   *   - Only SETTLED settlements can be refunded.
   *   - refundMinor must be positive integer.
   *   - refundMinor cannot exceed settledAmountMinor.
   *   - Partial refund → back to PARTIALLY_SETTLED.
   *   - Full refund → REFUNDED (terminal).
   *
   * Returns new Settlement instance.
   */
  applyRefund(refundMinor: number): Settlement {
    if (!this.isSettled) {
      throw new Error(`Settlement.applyRefund: only SETTLED settlements can be refunded; current=${this._props.status}`);
    }
    if (!Number.isInteger(refundMinor) || refundMinor <= 0) {
      throw new Error(`Settlement.applyRefund: refundMinor must be a positive integer; got ${refundMinor}`);
    }
    if (refundMinor > this._props.settledAmountMinor) {
      throw new Error(
        `Settlement.applyRefund: refund ${refundMinor} exceeds settled amount ${this._props.settledAmountMinor}`,
      );
    }

    const newSettled     = this._props.settledAmountMinor - refundMinor;
    const isFull         = newSettled === 0;
    const newStatus: SettlementStatus = isFull ? 'REFUNDED' : 'PARTIALLY_SETTLED';
    const now            = new Date().toISOString();

    return new Settlement({
      ...this._props,
      status:               newStatus,
      settledAmountMinor:   newSettled,
      remainingAmountMinor: this._props.amountMinor - newSettled,
      settledAt:            isFull ? null : this._props.settledAt,
      version:              this._props.version + 1,
      updatedAt:            now,
    }, [...this._allocations]);
  }

  /**
   * Cancels a PENDING or PARTIALLY_SETTLED settlement.
   * SETTLED settlements cannot be cancelled — they must be refunded.
   * Returns new Settlement instance.
   */
  cancel(reason?: string): Settlement {
    this.assertTransition('CANCELLED');
    const now = new Date().toISOString();
    return new Settlement({
      ...this._props,
      status:   'CANCELLED',
      notes:    reason ? `${this._props.notes ?? ''} [CANCELLED: ${reason}]`.trim() : this._props.notes,
      version:  this._props.version + 1,
      updatedAt: now,
    }, [...this._allocations]);
  }

  /** Updates notes. Only allowed when settlement is not terminal. */
  updateNotes(notes: string): Settlement {
    if (this.isTerminal) {
      throw new Error(`Settlement.updateNotes: cannot modify a ${this._props.status} settlement`);
    }
    return new Settlement({
      ...this._props,
      notes,
      version:  this._props.version + 1,
      updatedAt: new Date().toISOString(),
    }, [...this._allocations]);
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON() {
    return {
      ...this._props,
      allocations: this._allocations.map((a) => a.toJSON()),
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private assertTransition(to: SettlementStatus): void {
    const allowed = ALLOWED[this._props.status];
    if (!allowed.includes(to)) {
      throw new Error(
        `Settlement: illegal transition ${this._props.status} → ${to}`,
      );
    }
  }

  private static validateProps(p: SettlementProps): void {
    if (!p.settlementId)    throw new Error('Settlement: settlementId required');
    if (!p.tenantId)        throw new Error('Settlement: tenantId required');
    if (!p.invoiceId)       throw new Error('Settlement: invoiceId required');
    if (!p.currency || p.currency.length !== 3)
      throw new Error(`Settlement: currency must be 3-char ISO-4217; got "${p.currency}"`);
    if (!Number.isInteger(p.amountMinor) || p.amountMinor <= 0)
      throw new Error(`Settlement: amountMinor must be a positive integer; got ${p.amountMinor}`);
    if (p.settledAmountMinor < 0)
      throw new Error(`Settlement: settledAmountMinor cannot be negative`);
    if (p.settledAmountMinor > p.amountMinor)
      throw new Error(`Settlement: settledAmountMinor ${p.settledAmountMinor} exceeds amountMinor ${p.amountMinor}`);
    if (p.remainingAmountMinor !== p.amountMinor - p.settledAmountMinor)
      throw new Error(`Settlement: remainingAmountMinor mismatch`);
  }
}
