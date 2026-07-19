/**
 * posting-rule-engine.spec.ts
 *
 * Tests for the Posting Rule Engine:
 *   PostingPlan creation, PostingResult factories, PostingRuleEngine.resolve(),
 *   each PostingPolicy, batch resolution, determinism, immutability.
 */
import { PostingRuleEngine }      from './posting-rule-engine';
import {
  PaymentPostingPolicy,
  InvoicePostingPolicy,
  SettlementPostingPolicy,
  RevenueDistributionPostingPolicy,
  FinancialTransactionPostingPolicy,
} from './posting-policy';
import { createPostingPlan }      from './posting-plan.model';
import {
  postingPlanCreated, postingRejected, postingError,
} from './posting-result.model';
import type {
  CreateFinancialTransactionCommand,
  CreateInvoiceCommand,
  CreatePaymentCommand,
  CreateRevenueDistributionCommand,
  CreateSettlementCommand,
  FinanceCommandBatch,
} from '../intake/commands/finance.commands';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT = 'tenant-001';
const CUR    = 'GBP';

function makePayment(overrides: Partial<CreatePaymentCommand> = {}): CreatePaymentCommand {
  return {
    kind:                  'CreatePaymentCommand',
    tenantId:              TENANT,
    amountMinor:           2900,
    currency:              CUR,
    idempotencyKey:        'finance-pay-001',
    preferredGatewayHint:  'STRIPE',
    billingCycle:          'monthly',
    isTrial:               false,
    trialDays:             null,
    trialAmountMinor:      null,
    appliedDiscountMinor:  0,
    taxCode:               null,
    sourceReference:       'commercial-payment-snap-001',
    ...overrides,
  };
}

function makeInvoice(overrides: Partial<CreateInvoiceCommand> = {}): CreateInvoiceCommand {
  return {
    kind:            'CreateInvoiceCommand',
    tenantId:        TENANT,
    currency:        CUR,
    idempotencyKey:  'finance-inv-001',
    lines: [{
      description:    'Starter plan',
      lineType:       'subscription',
      quantity:       1,
      unitPriceMinor: 2900,
      subtotalMinor:  2900,
      discountMinor:  0,
      taxCode:        null,
    }],
    subtotalMinor:   2900,
    discountMinor:   0,
    taxMinor:        0,
    totalMinor:      2900,
    sourceReference: 'commercial-invoice-snap-001',
    packageLabel:    'starter@starter-v1',
    planId:          'plan-001',
    ...overrides,
  };
}

function makeSettlement(overrides: Partial<CreateSettlementCommand> = {}): CreateSettlementCommand {
  return {
    kind:                    'CreateSettlementCommand',
    tenantId:                TENANT,
    currency:                CUR,
    idempotencyKey:          'finance-set-001',
    ownershipType:           'PLATFORM',
    platformFeeBps:          0,
    settlementDelaySeconds:  0,
    holdInEscrow:            false,
    sourceReference:         'dedup-001',
    ...overrides,
  };
}

function makeRevenue(overrides: Partial<CreateRevenueDistributionCommand> = {}): CreateRevenueDistributionCommand {
  return {
    kind:                         'CreateRevenueDistributionCommand',
    tenantId:                     TENANT,
    currency:                     CUR,
    idempotencyKey:               'finance-rev-001',
    distributionType:             'FLAT_PERCENTAGE',
    tiers:                        [{ upToMinor: null, rateBps: 2000 }],
    transactionAmountMinor:       2900,
    estimatedPlatformAmountMinor: 580,
    sourceReference:              'dedup-001',
    ...overrides,
  };
}

function makeTxCommand(overrides: Partial<CreateFinancialTransactionCommand> = {}): CreateFinancialTransactionCommand {
  return {
    kind:             'CreateFinancialTransactionCommand',
    tenantId:         TENANT,
    transactionType:  'COMMERCIAL_DECISION',
    amountMinor:      2900,
    currency:         CUR,
    idempotencyKey:   'finance-tx-001',
    sourceType:       'platform_contract',
    sourceReference:  'env-001',
    country:          'GB',
    accountingPeriod: '2026-07',
    description:      'Test transaction',
    requestedAt:      '2026-07-19T10:00:00.000Z',
    ...overrides,
  };
}

function makeBatch(overrides: Partial<FinanceCommandBatch> = {}): FinanceCommandBatch {
  return Object.freeze({
    envelopeId:          'env-001',
    deduplicationKey:    'commercial-decision-tenant-001-snap-001',
    correlationId:       'corr-001',
    transaction:         Object.freeze(makeTxCommand()),
    invoice:             Object.freeze(makeInvoice()),
    payment:             Object.freeze(makePayment()),
    settlement:          Object.freeze(makeSettlement()),
    revenueDistribution: Object.freeze(makeRevenue()),
    mappedAt:            '2026-07-19T10:00:00.000Z',
    ...overrides,
  });
}

// =============================================================================
// Tests
// =============================================================================

// ── PostingPlan model ─────────────────────────────────────────────────────────

describe('createPostingPlan()', () => {
  it('creates a balanced plan with correct totals', () => {
    const p = createPostingPlan({
      planId:           'plan-001',
      tenantId:         TENANT,
      postingType:      'PAYMENT_RECEIPT',
      accountingPeriod: '2026-07',
      currency:         CUR,
      sourceReference:  'ref-001',
      description:      'Test plan',
      instructions: [
        { accountCode: '1000', side: 'DEBIT',  amountMinor: 2900, currency: CUR, description: 'DR' },
        { accountCode: '3000', side: 'CREDIT', amountMinor: 2900, currency: CUR, description: 'CR' },
      ],
    });
    expect(p.isBalanced).toBe(true);
    expect(p.totalDebitMinor).toBe(2900);
    expect(p.totalCreditMinor).toBe(2900);
  });

  it('marks an unbalanced plan correctly (does not throw)', () => {
    const p = createPostingPlan({
      planId: 'plan-x', tenantId: TENANT, postingType: 'PAYMENT_RECEIPT',
      accountingPeriod: '2026-07', currency: CUR, sourceReference: 'x', description: 'x',
      instructions: [
        { accountCode: '1000', side: 'DEBIT', amountMinor: 5000, currency: CUR, description: 'DR' },
      ],
    });
    expect(p.isBalanced).toBe(false);
    expect(p.totalDebitMinor).toBe(5000);
    expect(p.totalCreditMinor).toBe(0);
  });

  it('is fully frozen', () => {
    const p = createPostingPlan({
      planId: 'p', tenantId: TENANT, postingType: 'PAYMENT_RECEIPT',
      accountingPeriod: '2026-07', currency: CUR, sourceReference: 'x', description: 'x',
      instructions: [],
    });
    expect(Object.isFrozen(p)).toBe(true);
    expect(Object.isFrozen(p.instructions)).toBe(true);
  });
});

// ── PostingResult factories ───────────────────────────────────────────────────

describe('PostingResult factories', () => {
  it('postingPlanCreated produces frozen success result', () => {
    const p = createPostingPlan({ planId: 'p', tenantId: TENANT, postingType: 'PAYMENT_RECEIPT', accountingPeriod: '2026-07', currency: CUR, sourceReference: 'x', description: 'x', instructions: [] });
    const r = postingPlanCreated(p);
    expect(r.success).toBe(true);
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('postingRejected produces frozen rejected result', () => {
    const r = postingRejected('UNSUPPORTED_COMMAND', [postingError('kind', 'test')]);
    expect(r.success).toBe(false);
    expect(r.reason).toBe('UNSUPPORTED_COMMAND');
    expect(Object.isFrozen(r)).toBe(true);
    expect(Object.isFrozen(r.errors)).toBe(true);
  });
});

// ── PaymentPostingPolicy ──────────────────────────────────────────────────────

describe('PaymentPostingPolicy', () => {
  const policy = new PaymentPostingPolicy();

  it('canHandle CreatePaymentCommand', () => {
    expect(policy.canHandle(makePayment())).toBe(true);
    expect(policy.canHandle(makeInvoice())).toBe(false);
  });

  it('produces a balanced plan', () => {
    const r = policy.apply(makePayment());
    expect(r.success).toBe(true);
    if (r.success) expect(r.plan.isBalanced).toBe(true);
  });

  it('DR 1000, CR 3000 for standard payment with no discount', () => {
    const r = policy.apply(makePayment({ amountMinor: 2900, appliedDiscountMinor: 0 }));
    if (!r.success) throw r;
    const ins = r.plan.instructions;
    expect(ins.find((i) => i.accountCode === '1000' && i.side === 'DEBIT')?.amountMinor).toBe(2900);
    expect(ins.find((i) => i.accountCode === '3000' && i.side === 'CREDIT')?.amountMinor).toBe(2900);
  });

  it('adds discount credit to 5000 when discount > 0', () => {
    const r = policy.apply(makePayment({ amountMinor: 3000, appliedDiscountMinor: 300 }));
    if (!r.success) throw r;
    expect(r.plan.instructions.some((i) => i.accountCode === '5000')).toBe(true);
    expect(r.plan.isBalanced).toBe(true);
  });

  it('uses trialAmountMinor for trial payment — rejects zero trial amount', () => {
    const r = policy.apply(makePayment({ isTrial: true, trialAmountMinor: 0, amountMinor: 2900 }));
    // trialAmountMinor=0 is not a positive integer — VALIDATION_FAILURE
    expect(r.success).toBe(false);
    if (!r.success) expect(['VALIDATION_FAILURE', 'ZERO_AMOUNT'].includes(r.reason)).toBe(true);
  });

  it('accepts non-zero trial amount', () => {
    const r = policy.apply(makePayment({ isTrial: true, trialAmountMinor: 100, amountMinor: 2900 }));
    expect(r.success).toBe(true);
    if (r.success) expect(r.plan.isBalanced).toBe(true);
  });

  it('rejects zero amount', () => {
    const r = policy.apply(makePayment({ amountMinor: 0 }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe('VALIDATION_FAILURE');
  });

  it('produces frozen plan', () => {
    const r = policy.apply(makePayment());
    if (r.success) {
      expect(Object.isFrozen(r.plan)).toBe(true);
      expect(Object.isFrozen(r.plan.instructions)).toBe(true);
    }
  });
});

// ── InvoicePostingPolicy ──────────────────────────────────────────────────────

describe('InvoicePostingPolicy', () => {
  const policy = new InvoicePostingPolicy();

  it('canHandle CreateInvoiceCommand', () => {
    expect(policy.canHandle(makeInvoice())).toBe(true);
    expect(policy.canHandle(makePayment())).toBe(false);
  });

  it('produces a balanced plan', () => {
    const r = policy.apply(makeInvoice());
    expect(r.success).toBe(true);
    if (r.success) expect(r.plan.isBalanced).toBe(true);
  });

  it('DR 2000, CR 4000 for standard invoice', () => {
    const r = policy.apply(makeInvoice({ totalMinor: 2900, subtotalMinor: 2900, discountMinor: 0 }));
    if (!r.success) throw r;
    expect(r.plan.instructions.find((i) => i.accountCode === '2000' && i.side === 'DEBIT')?.amountMinor).toBe(2900);
    expect(r.plan.instructions.find((i) => i.accountCode === '4000' && i.side === 'CREDIT')?.amountMinor).toBe(2900);
  });

  it('rejects empty lines array', () => {
    const r = policy.apply(makeInvoice({ lines: [] }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe('VALIDATION_FAILURE');
  });

  it('rejects zero total', () => {
    const r = policy.apply(makeInvoice({ totalMinor: 0, subtotalMinor: 0 }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe('ZERO_AMOUNT');
  });

  it('rejects negative total', () => {
    const r = policy.apply(makeInvoice({ totalMinor: -100, subtotalMinor: -100 }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe('NEGATIVE_AMOUNT');
  });
});

// ── SettlementPostingPolicy ───────────────────────────────────────────────────

describe('SettlementPostingPolicy', () => {
  const policy = new SettlementPostingPolicy();

  it('canHandle CreateSettlementCommand', () => {
    expect(policy.canHandle(makeSettlement())).toBe(true);
    expect(policy.canHandle(makePayment())).toBe(false);
  });

  it('PLATFORM: DR 6000, CR 1000', () => {
    const r = policy.apply(makeSettlement({ ownershipType: 'PLATFORM' }));
    if (!r.success) throw r;
    expect(r.plan.instructions.find((i) => i.accountCode === '6000')?.side).toBe('DEBIT');
    expect(r.plan.instructions.find((i) => i.accountCode === '1000')?.side).toBe('CREDIT');
    expect(r.plan.isBalanced).toBe(true);
  });

  it('TENANT: DR 6000, CR 2000', () => {
    const r = policy.apply(makeSettlement({ ownershipType: 'TENANT' }));
    if (!r.success) throw r;
    expect(r.plan.instructions.find((i) => i.accountCode === '2000')?.side).toBe('CREDIT');
  });

  it('SPLIT: DR 6000, CR 1000 + CR 2000 balanced', () => {
    const r = policy.apply(makeSettlement({ ownershipType: 'SPLIT', platformFeeBps: 2000 }));
    if (!r.success) throw r;
    expect(r.plan.isBalanced).toBe(true);
    expect(r.plan.instructions.filter((i) => i.side === 'CREDIT').length).toBe(2);
  });

  it('rejects invalid platformFeeBps', () => {
    const r = policy.apply(makeSettlement({ platformFeeBps: -1 }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe('VALIDATION_FAILURE');
  });
});

// ── RevenueDistributionPostingPolicy ─────────────────────────────────────────

describe('RevenueDistributionPostingPolicy', () => {
  const policy = new RevenueDistributionPostingPolicy();

  it('canHandle CreateRevenueDistributionCommand', () => {
    expect(policy.canHandle(makeRevenue())).toBe(true);
    expect(policy.canHandle(makePayment())).toBe(false);
  });

  it('DR 4000, CR 3000 + CR 7000 balanced', () => {
    const r = policy.apply(makeRevenue({ transactionAmountMinor: 2900, estimatedPlatformAmountMinor: 580 }));
    if (!r.success) throw r;
    expect(r.plan.isBalanced).toBe(true);
    const cr3000 = r.plan.instructions.find((i) => i.accountCode === '3000' && i.side === 'CREDIT');
    const cr7000 = r.plan.instructions.find((i) => i.accountCode === '7000' && i.side === 'CREDIT');
    expect(cr3000?.amountMinor).toBe(580);
    expect(cr7000?.amountMinor).toBe(2320);
  });

  it('rejects when platform share exceeds total', () => {
    const r = policy.apply(makeRevenue({ transactionAmountMinor: 1000, estimatedPlatformAmountMinor: 1500 }));
    expect(r.success).toBe(false);
    if (!r.success) expect(r.reason).toBe('VALIDATION_FAILURE');
  });

  it('zero transactionAmountMinor fails validation', () => {
    const r = policy.apply(makeRevenue({ transactionAmountMinor: 0 }));
    expect(r.success).toBe(false);
  });
});

// ── PostingRuleEngine ─────────────────────────────────────────────────────────

describe('PostingRuleEngine', () => {
  describe('resolve() — policy selection', () => {
    it('selects PaymentPostingPolicy for CreatePaymentCommand', () => {
      const r = PostingRuleEngine.resolve(makePayment());
      expect(r.success).toBe(true);
      if (r.success) expect(r.plan.postingType).toBe('PAYMENT_RECEIPT');
    });

    it('selects InvoicePostingPolicy for CreateInvoiceCommand', () => {
      const r = PostingRuleEngine.resolve(makeInvoice());
      expect(r.success).toBe(true);
      if (r.success) expect(r.plan.postingType).toBe('INVOICE_REVENUE');
    });

    it('selects SettlementPostingPolicy for CreateSettlementCommand', () => {
      const r = PostingRuleEngine.resolve(makeSettlement());
      expect(r.success).toBe(true);
      if (r.success) expect(r.plan.postingType).toBe('SETTLEMENT');
    });

    it('selects RevenueDistributionPostingPolicy', () => {
      const r = PostingRuleEngine.resolve(makeRevenue());
      expect(r.success).toBe(true);
      if (r.success) expect(r.plan.postingType).toBe('REVENUE_DISTRIBUTION');
    });

    it('selects FinancialTransactionPostingPolicy', () => {
      const r = PostingRuleEngine.resolve(makeTxCommand());
      expect(r.success).toBe(true);
    });

    it('returns UNSUPPORTED_COMMAND for unknown kind', () => {
      const r = PostingRuleEngine.resolve({ kind: 'SomeUnknownCommand' });
      expect(r.success).toBe(false);
      if (!r.success) expect(r.reason).toBe('UNSUPPORTED_COMMAND');
    });

    it('returns UNSUPPORTED_COMMAND for null input', () => {
      const r = PostingRuleEngine.resolve(null);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.reason).toBe('UNSUPPORTED_COMMAND');
    });
  });

  describe('resolve() — determinism', () => {
    it('same payment command always produces same account codes', () => {
      const cmd = makePayment();
      const rA  = PostingRuleEngine.resolve(cmd);
      const rB  = PostingRuleEngine.resolve(cmd);
      if (!rA.success || !rB.success) throw rA;
      const codesA = rA.plan.instructions.map((i) => `${i.accountCode}:${i.side}`).sort().join(',');
      const codesB = rB.plan.instructions.map((i) => `${i.accountCode}:${i.side}`).sort().join(',');
      expect(codesA).toBe(codesB);
    });

    it('same revenue command produces same tenant and platform amounts', () => {
      const cmd = makeRevenue();
      const rA  = PostingRuleEngine.resolve(cmd);
      const rB  = PostingRuleEngine.resolve(cmd);
      if (!rA.success || !rB.success) throw rA;
      expect(rA.plan.totalDebitMinor).toBe(rB.plan.totalDebitMinor);
    });
  });

  describe('resolveBatch()', () => {
    it('resolves all 5 commands in a full batch', () => {
      const result = PostingRuleEngine.resolveBatch(makeBatch());
      expect(result.transaction.success).toBe(true);
      expect(result.payment?.success).toBe(true);
      expect(result.invoice?.success).toBe(true);
      expect(result.settlement.success).toBe(true);
      expect(result.revenueDistribution?.success).toBe(true);
      expect(result.allSucceeded).toBe(true);
    });

    it('null payment/invoice/revenue produce null results', () => {
      const result = PostingRuleEngine.resolveBatch(makeBatch({
        payment: null, invoice: null, revenueDistribution: null,
      }));
      expect(result.payment).toBeNull();
      expect(result.invoice).toBeNull();
      expect(result.revenueDistribution).toBeNull();
      expect(result.allSucceeded).toBe(true);   // transaction + settlement both succeed
    });

    it('allSucceeded=false when any non-null command fails', () => {
      const result = PostingRuleEngine.resolveBatch(makeBatch({
        payment: Object.freeze(makePayment({ amountMinor: 0 })),
      }));
      expect(result.allSucceeded).toBe(false);
    });

    it('BatchPostingResult is frozen', () => {
      const result = PostingRuleEngine.resolveBatch(makeBatch());
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('PostingPlan immutability (engine output)', () => {
    it('resolved plan is frozen', () => {
      const r = PostingRuleEngine.resolve(makePayment());
      if (r.success) expect(Object.isFrozen(r.plan)).toBe(true);
    });

    it('instructions array in resolved plan is frozen', () => {
      const r = PostingRuleEngine.resolve(makePayment());
      if (r.success) expect(Object.isFrozen(r.plan.instructions)).toBe(true);
    });

    it('mutating a resolved plan throws', () => {
      const r = PostingRuleEngine.resolve(makePayment());
      if (r.success) expect(() => { (r.plan as any).tenantId = 'mutated'; }).toThrow();
    });
  });

  describe('No persistence or side effects', () => {
    it('resolve() is synchronous and returns a plain object', () => {
      const result = PostingRuleEngine.resolve(makePayment());
      expect(result).not.toBeInstanceOf(Promise);
      expect(typeof result).toBe('object');
    });

    it('engine source has no database or repository imports', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const source = fs.readFileSync(
        path.resolve(process.cwd(), 'src/modules/posting/posting-rule-engine.ts'), 'utf8',
      );
      const imports = source.split('\n').filter((l) => l.trim().startsWith('import'));
      imports.forEach((line) => {
        expect(line).not.toMatch(/typeorm|repository|database|entity|EntityManager/i);
        expect(line).not.toMatch(/EventEmitter|rabbitmq|kafka/i);
      });
    });
  });
});
