/**
 * settlement-payment-method.ts
 *
 * SettlementPaymentMethod — the payment instruments supported by the
 * Settlement domain aggregate.
 *
 * Extended from the existing PaymentMethod type in payment.entity.ts.
 * Adds gateway-branded methods (Razorpay, Stripe) and Wallet.
 *
 * IMPORTANT: Do NOT import from payment.entity.ts here — that is a
 * persistence concern. This is a domain value object.
 */

export const SettlementPaymentMethods = [
  'cash',
  'bank_transfer',
  'upi',
  'card_credit',
  'card_debit',
  'cheque',
  'razorpay',
  'stripe',
  'wallet',
  'other',
] as const;

export type SettlementPaymentMethod = typeof SettlementPaymentMethods[number];

/**
 * Returns true when the given string is a supported SettlementPaymentMethod.
 */
export function isSettlementPaymentMethod(value: string): value is SettlementPaymentMethod {
  return (SettlementPaymentMethods as readonly string[]).includes(value);
}

/**
 * PaymentAllocation — immutable value object recording how much of a
 * payment is applied to a specific invoice.
 *
 * One Settlement may allocate across multiple invoices in future phases.
 * For now a Settlement always allocates to exactly one invoice.
 */
export interface PaymentAllocationProps {
  readonly allocationId:  string;
  readonly invoiceId:     string;
  /** Amount allocated to this invoice in minor currency units. INT only. */
  readonly amountMinor:   number;
  readonly currency:      string;
  readonly allocatedAt:   string;   // ISO-8601
}

export class PaymentAllocation {
  private readonly _props: Readonly<PaymentAllocationProps>;

  private constructor(props: PaymentAllocationProps) {
    PaymentAllocation.validate(props);
    this._props = Object.freeze({ ...props });
  }

  static create(props: Omit<PaymentAllocationProps, 'allocatedAt'>): PaymentAllocation {
    return new PaymentAllocation({ ...props, allocatedAt: new Date().toISOString() });
  }

  static reconstitute(props: PaymentAllocationProps): PaymentAllocation {
    return new PaymentAllocation(props);
  }

  get allocationId():  string { return this._props.allocationId; }
  get invoiceId():     string { return this._props.invoiceId; }
  get amountMinor():   number { return this._props.amountMinor; }
  get currency():      string { return this._props.currency; }
  get allocatedAt():   string { return this._props.allocatedAt; }

  toJSON(): Readonly<PaymentAllocationProps> {
    return { ...this._props };
  }

  private static validate(p: PaymentAllocationProps): void {
    if (!p.allocationId)            throw new Error('PaymentAllocation: allocationId required');
    if (!p.invoiceId)               throw new Error('PaymentAllocation: invoiceId required');
    if (!p.currency || p.currency.length !== 3)
      throw new Error(`PaymentAllocation: currency must be 3-char ISO-4217; got "${p.currency}"`);
    if (!Number.isInteger(p.amountMinor) || p.amountMinor <= 0)
      throw new Error(`PaymentAllocation: amountMinor must be a positive integer; got ${p.amountMinor}`);
  }
}
