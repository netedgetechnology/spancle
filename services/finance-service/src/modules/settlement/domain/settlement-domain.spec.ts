/**
 * settlement-domain.spec.ts
 */
import {
  PaymentAllocation,
  isSettlementPaymentMethod,
  SettlementPaymentMethods,
} from './settlement-payment-method';
import { Settlement }             from './settlement.aggregate';
import {
  settlementCreatedEvent, settlementCompletedEvent,
  settlementCancelledEvent, settlementRefundedEvent, settlementPartialEvent,
  settlementCreated, settlementUpdated, settlementCompleted,
  settlementCancelled, settlementRefunded, settlementRejected, settlementError,
  SettlementEventTypes,
} from './settlement-domain';

// ── Helpers ───────────────────────────────────────────────────────────────────

const T = 'tenant-001', INV = 'inv-001', CUST = 'cust-001', CUR = 'GBP';

function makeSettlement(amountMinor = 10000): Settlement {
  return Settlement.create({
    settlementId:    'set-001',
    tenantId:        T,
    invoiceId:       INV,
    customerId:      CUST,
    paymentReference: 'PAY-REF-001',
    paymentMethod:   'stripe',
    currency:        CUR,
    amountMinor,
    notes:           null,
  });
}

function makeAllocation(amountMinor: number, id = 'alloc-001'): PaymentAllocation {
  return PaymentAllocation.create({
    allocationId: id,
    invoiceId:    INV,
    amountMinor,
    currency:     CUR,
  });
}

// =============================================================================

describe('SettlementPaymentMethod', () => {
  it('isSettlementPaymentMethod returns true for valid methods', () => {
    SettlementPaymentMethods.forEach((m) => expect(isSettlementPaymentMethod(m)).toBe(true));
  });

  it('returns false for unknown method', () => {
    expect(isSettlementPaymentMethod('paypal')).toBe(false);
  });

  it('includes razorpay, stripe, and wallet', () => {
    expect(isSettlementPaymentMethod('razorpay')).toBe(true);
    expect(isSettlementPaymentMethod('stripe')).toBe(true);
    expect(isSettlementPaymentMethod('wallet')).toBe(true);
  });
});

describe('PaymentAllocation', () => {
  it('creates with correct fields', () => {
    const a = makeAllocation(5000);
    expect(a.amountMinor).toBe(5000);
    expect(a.currency).toBe(CUR);
    expect(a.invoiceId).toBe(INV);
  });

  it('throws for zero amount', () => {
    expect(() => PaymentAllocation.create({ allocationId: 'a', invoiceId: 'x', amountMinor: 0, currency: CUR }))
      .toThrow(/positive integer/);
  });

  it('throws for bad currency', () => {
    expect(() => PaymentAllocation.create({ allocationId: 'a', invoiceId: 'x', amountMinor: 100, currency: 'GBPP' }))
      .toThrow(/3-char/);
  });

  it('toJSON returns expected fields', () => {
    const a = makeAllocation(100);
    const j = a.toJSON();
    expect(j.amountMinor).toBe(100);
    expect(j.invoiceId).toBe(INV);
    expect(typeof j.allocatedAt).toBe('string');
  });
});

describe('Settlement.create()', () => {
  it('starts in PENDING status', () => {
    expect(makeSettlement().isPending).toBe(true);
    expect(makeSettlement().status).toBe('PENDING');
  });

  it('settledAmountMinor=0, remainingAmountMinor=amountMinor', () => {
    const s = makeSettlement(8000);
    expect(s.settledAmountMinor).toBe(0);
    expect(s.remainingAmountMinor).toBe(8000);
  });

  it('version starts at 1', () => {
    expect(makeSettlement().version).toBe(1);
  });

  it('settledAt is null initially', () => {
    expect(makeSettlement().settledAt).toBeNull();
  });

  it('throws for non-positive amountMinor', () => {
    expect(() => Settlement.create({ settlementId:'x', tenantId:T, invoiceId:INV,
      customerId:CUST, paymentReference:'ref', paymentMethod:'cash',
      currency:CUR, amountMinor:0, notes:null })).toThrow(/positive integer/);
  });
});

describe('Settlement.applyPayment()', () => {
  it('partial payment → PARTIALLY_SETTLED', () => {
    const s = makeSettlement(10000).applyPayment(4000, makeAllocation(4000));
    expect(s.isPartiallySettled).toBe(true);
    expect(s.settledAmountMinor).toBe(4000);
    expect(s.remainingAmountMinor).toBe(6000);
  });

  it('full payment → SETTLED with settledAt set', () => {
    const s = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    expect(s.isSettled).toBe(true);
    expect(s.remainingAmountMinor).toBe(0);
    expect(s.settledAt).not.toBeNull();
  });

  it('two partial payments accumulate correctly', () => {
    const s1 = makeSettlement(10000).applyPayment(3000, makeAllocation(3000, 'a1'));
    const s2 = s1.applyPayment(4000, makeAllocation(4000, 'a2'));
    expect(s2.settledAmountMinor).toBe(7000);
    expect(s2.allocations).toHaveLength(2);
  });

  it('final payment from PARTIALLY_SETTLED → SETTLED', () => {
    const s1 = makeSettlement(10000).applyPayment(7000, makeAllocation(7000, 'a1'));
    const s2 = s1.applyPayment(3000, makeAllocation(3000, 'a2'));
    expect(s2.isSettled).toBe(true);
    expect(s2.version).toBe(3);
  });

  it('overpayment throws', () => {
    expect(() => makeSettlement(5000).applyPayment(6000, makeAllocation(6000)))
      .toThrow(/overpayment/);
  });

  it('zero payment throws', () => {
    expect(() => makeSettlement(5000).applyPayment(0, makeAllocation(1)))
      .toThrow(/positive integer/);
  });

  it('cannot apply payment to CANCELLED settlement', () => {
    const cancelled = makeSettlement().cancel();
    expect(() => cancelled.applyPayment(100, makeAllocation(100))).toThrow(/CANCELLED/);
  });

  it('increments version', () => {
    expect(makeSettlement().applyPayment(1000, makeAllocation(1000)).version).toBe(2);
  });

  it('returns new instance — original unchanged', () => {
    const s     = makeSettlement(5000);
    const after = s.applyPayment(2000, makeAllocation(2000));
    expect(s.settledAmountMinor).toBe(0);
    expect(after.settledAmountMinor).toBe(2000);
  });
});

describe('Settlement.applyRefund()', () => {
  it('partial refund → PARTIALLY_SETTLED', () => {
    const settled  = makeSettlement(10000).applyPayment(10000, makeAllocation(10000));
    const refunded = settled.applyRefund(3000);
    expect(refunded.isPartiallySettled).toBe(true);
    expect(refunded.settledAmountMinor).toBe(7000);
    expect(refunded.remainingAmountMinor).toBe(3000);
  });

  it('full refund → REFUNDED (terminal)', () => {
    const settled  = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    const refunded = settled.applyRefund(5000);
    expect(refunded.isRefunded).toBe(true);
    expect(refunded.isTerminal).toBe(true);
    expect(refunded.settledAmountMinor).toBe(0);
  });

  it('refund exceeding settled amount throws', () => {
    const settled = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    expect(() => settled.applyRefund(6000)).toThrow(/exceeds settled/);
  });

  it('zero refund throws', () => {
    const settled = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    expect(() => settled.applyRefund(0)).toThrow(/positive integer/);
  });

  it('refund on PENDING throws', () => {
    expect(() => makeSettlement(5000).applyRefund(100)).toThrow(/only SETTLED/);
  });

  it('REFUNDED settlement cannot be modified further', () => {
    const s = makeSettlement(5000).applyPayment(5000, makeAllocation(5000)).applyRefund(5000);
    expect(() => s.applyRefund(100)).toThrow(/only SETTLED/);
    expect(() => s.cancel()).toThrow(/REFUNDED → CANCELLED/);
  });
});

describe('Settlement.cancel()', () => {
  it('PENDING → CANCELLED', () => {
    expect(makeSettlement().cancel().isCancelled).toBe(true);
  });

  it('PARTIALLY_SETTLED → CANCELLED', () => {
    const partial = makeSettlement(10000).applyPayment(5000, makeAllocation(5000));
    expect(partial.cancel().isCancelled).toBe(true);
  });

  it('SETTLED → CANCELLED is illegal', () => {
    const settled = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    expect(() => settled.cancel()).toThrow(/SETTLED → CANCELLED/);
  });

  it('double cancel is illegal', () => {
    const cancelled = makeSettlement().cancel();
    expect(() => cancelled.cancel()).toThrow(/CANCELLED → CANCELLED/);
  });

  it('CANCELLED settlement is immutable', () => {
    const c = makeSettlement().cancel();
    expect(() => c.applyPayment(100, makeAllocation(100))).toThrow(/CANCELLED/);
    expect(() => c.updateNotes('test')).toThrow(/CANCELLED/);
  });
});

describe('Settlement domain events', () => {
  it('settlementCreatedEvent has correct fields', () => {
    const s = makeSettlement();
    const e = settlementCreatedEvent(s, 'corr-001');
    expect(e.eventType).toBe(SettlementEventTypes.SETTLEMENT_CREATED);
    expect(e.settlementId).toBe('set-001');
    expect(e.amountMinor).toBe(10000);
    expect(e.paymentMethod).toBe('stripe');
    expect(Object.isFrozen(e)).toBe(true);
    expect(typeof e.eventId).toBe('string');
  });

  it('settlementCompletedEvent has settledAt', () => {
    const settled = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    const e = settlementCompletedEvent(settled, null);
    expect(e.eventType).toBe(SettlementEventTypes.SETTLEMENT_COMPLETED);
    expect(e.settledAmountMinor).toBe(5000);
    expect(typeof e.settledAt).toBe('string');
  });

  it('settlementCancelledEvent is frozen', () => {
    const e = settlementCancelledEvent(makeSettlement().cancel(), null);
    expect(e.eventType).toBe(SettlementEventTypes.SETTLEMENT_CANCELLED);
    expect(Object.isFrozen(e)).toBe(true);
  });

  it('settlementRefundedEvent includes refundedAmountMinor', () => {
    const settled  = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    const refunded = settled.applyRefund(2000);
    const e = settlementRefundedEvent(refunded, 2000, null);
    expect(e.refundedAmountMinor).toBe(2000);
    expect(e.remainingMinor).toBe(2000);
  });

  it('settlementPartialEvent includes settled and remaining amounts', () => {
    const partial = makeSettlement(10000).applyPayment(4000, makeAllocation(4000));
    const e = settlementPartialEvent(partial, 'corr-x');
    expect(e.settledAmountMinor).toBe(4000);
    expect(e.remainingAmountMinor).toBe(6000);
  });

  it('each event has a unique UUID eventId', () => {
    const s = makeSettlement();
    const e1 = settlementCreatedEvent(s, null);
    const e2 = settlementCreatedEvent(s, null);
    expect(e1.eventId).not.toBe(e2.eventId);
  });
});

describe('SettlementResult factories', () => {
  it('settlementCreated returns frozen success kind=SettlementCreated', () => {
    const r = settlementCreated(makeSettlement());
    expect(r.success).toBe(true);
    expect(r.kind).toBe('SettlementCreated');
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('settlementCompleted returns kind=SettlementCompleted', () => {
    const s = makeSettlement(5000).applyPayment(5000, makeAllocation(5000));
    expect(settlementCompleted(s).kind).toBe('SettlementCompleted');
  });

  it('settlementCancelled returns kind=SettlementCancelled', () => {
    expect(settlementCancelled(makeSettlement().cancel()).kind).toBe('SettlementCancelled');
  });

  it('settlementRefunded returns kind=SettlementRefunded', () => {
    const s = makeSettlement(5000).applyPayment(5000, makeAllocation(5000)).applyRefund(5000);
    expect(settlementRefunded(s).kind).toBe('SettlementRefunded');
  });

  it('settlementRejected returns frozen failure result', () => {
    const r = settlementRejected('OVERPAYMENT', [settlementError('amountMinor', 'exceeds invoice')]);
    expect(r.success).toBe(false);
    expect(r.kind).toBe('SettlementRejected');
    expect(r.reason).toBe('OVERPAYMENT');
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.errors)).toBe(true);
  });
});

describe('No ledger / accounting dependency', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  ['settlement.aggregate.ts', 'settlement-domain.ts', 'settlement-payment-method.ts'].forEach((file) => {
    it(`${file} has no ledger, accounting, or TypeORM imports`, () => {
      const src = fs.readFileSync(path.resolve(process.cwd(), `src/modules/settlement/domain/${file}`), 'utf8');
      src.split('\n').filter((l: string) => l.trim().startsWith('import')).forEach((line: string) => {
        expect(line).not.toMatch(/ledger|accounting|typeorm|posting/i);
        expect(line).not.toMatch(/EventEmitter|rabbitmq|kafka/i);
      });
    });
  });
});
