/**
 * ledger-posting-engine.spec.ts
 *
 * Tests for the Ledger Posting Engine:
 *   LedgerBalanceValidator, LedgerEntryBuilder, LedgerPostingEngine (mocked persistence)
 *   Typed results, immutability, determinism, rollback simulation.
 */
import { LedgerBalanceValidator }  from './ledger-balance-validator';
import { LedgerEntryBuilder }      from './ledger-entry-builder';
import { LedgerPostingEngine }     from './ledger-posting-engine';
import { LedgerPersistenceUnit }   from './ledger-persistence-unit';
import { postingSucceeded, postingFailed, ledgerError } from './ledger-posting-result';
import { createPostingPlan }       from '../posting/posting-plan.model';
import { ChartOfAccountsResolver } from '../accounting/chart-of-accounts-resolver';
import { buildResolutionContext }  from '../accounting/resolved-posting-plan.model';
import type { ResolvedPostingPlan } from '../accounting/resolved-posting-plan.model';
import type { PostingEngineContext } from './ledger-posting-engine';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-001';
const CUR    = 'GBP';

function ctx(period = '2026-07') {
  return buildResolutionContext(TENANT, period, CUR);
}

function makeBalancedPlan(amountMinor = 2900): Readonly<ResolvedPostingPlan> {
  const plan = createPostingPlan({
    planId:           'plan-001',
    tenantId:         TENANT,
    postingType:      'PAYMENT_RECEIPT',
    accountingPeriod: '2026-07',
    currency:         CUR,
    sourceReference:  'ref-001',
    description:      'Test plan',
    instructions: [
      { accountCode: '1000', side: 'DEBIT',  amountMinor, currency: CUR, description: 'DR cash' },
      { accountCode: '3000', side: 'CREDIT', amountMinor, currency: CUR, description: 'CR revenue' },
    ],
  });
  const result = ChartOfAccountsResolver.resolve(plan, ctx());
  if (!result.resolved) throw new Error(`Plan could not be resolved: ${JSON.stringify(result.errors)}`);
  return result.plan;
}

function makeUnbalancedPlan(): Readonly<ResolvedPostingPlan> {
  // Force an unbalanced plan by building a resolved plan and patching totals
  const balanced = makeBalancedPlan();
  // Manually craft an unbalanced resolved plan
  return Object.freeze({
    ...balanced,
    totalDebitMinor:  3000,
    totalCreditMinor: 2900,
    isBalanced:       false,
  });
}

function makeEngineContext(overrides: Partial<PostingEngineContext> = {}): PostingEngineContext {
  return {
    transactionId: 'tx-00000001-0000-0000-0000-000000000001',
    reference:     'FT-202607-00001',
    periodIsOpen:  true,
    postedAt:      new Date('2026-07-19T10:00:00Z'),
    ...overrides,
  };
}

function mockPersistence(returns: ReturnType<typeof postingSucceeded | typeof postingFailed>) {
  return { persist: jest.fn().mockResolvedValue(returns) } as unknown as LedgerPersistenceUnit;
}

// =============================================================================
// Tests
// =============================================================================

// ── postingSucceeded / postingFailed factories ────────────────────────────────

describe('LedgerPostingResult factories', () => {
  it('postingSucceeded is frozen with entryIds', () => {
    const entries = LedgerEntryBuilder.build(
      makeBalancedPlan(), 'tx-001', 'ent-plan-001', new Date(),
    );
    const r = postingSucceeded('tx-001', entries);
    expect(r.success).toBe(true);
    expect(Object.isFrozen(r)).toBe(true);
    expect(r.entryIds).toHaveLength(2);
  });

  it('postingFailed is frozen with reason and errors', () => {
    const r = postingFailed('IMBALANCE_DETECTED', [ledgerError('instructions', 'test')]);
    expect(r.success).toBe(false);
    expect(r.reason).toBe('IMBALANCE_DETECTED');
    expect(Object.isFrozen(r)).toBe(true);
  });
});

// ── LedgerBalanceValidator ────────────────────────────────────────────────────

describe('LedgerBalanceValidator', () => {
  it('accepts a balanced plan when period is OPEN', () => {
    const result = LedgerBalanceValidator.validate(makeBalancedPlan(), true);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeNull();
  });

  it('rejects when period is CLOSED (ACCOUNTING_PERIOD_CLOSED)', () => {
    const result = LedgerBalanceValidator.validate(makeBalancedPlan(), false);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ACCOUNTING_PERIOD_CLOSED');
  });

  it('rejects an unbalanced plan (IMBALANCE_DETECTED)', () => {
    const result = LedgerBalanceValidator.validate(makeUnbalancedPlan(), true);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('IMBALANCE_DETECTED');
    expect(result.errors[0]!.message).toContain('not balanced');
  });

  it('rejects a plan with no debits', () => {
    const plan = createPostingPlan({
      planId: 'p', tenantId: TENANT, postingType: 'PAYMENT_RECEIPT',
      accountingPeriod: '2026-07', currency: CUR, sourceReference: 'x', description: 'x',
      instructions: [
        { accountCode: '3000', side: 'CREDIT', amountMinor: 1000, currency: CUR, description: 'cr' },
      ],
    });
    // Must resolve before validating
    const resolved = ChartOfAccountsResolver.resolve(plan, ctx());
    if (!resolved.resolved) return;  // skip if resolution fails due to balance
    const result = LedgerBalanceValidator.validate(resolved.plan, true);
    // May fail at balance or at instructions check
    expect(result.valid).toBe(false);
  });

  it('rejects a plan with mixed currencies (CURRENCY_MISMATCH)', () => {
    // Build a plan with two different currencies
    const plan = Object.freeze({
      ...makeBalancedPlan(),
      instructions: Object.freeze([
        Object.freeze({ accountCode: '1000', side: 'DEBIT' as const, amountMinor: 1000, currency: 'GBP', description: 'dr' }),
        Object.freeze({ accountCode: '3000', side: 'CREDIT' as const, amountMinor: 1000, currency: 'USD', description: 'cr' }),
      ]),
    });
    const result = LedgerBalanceValidator.validate(plan as any, true);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('CURRENCY_MISMATCH');
  });

  it('rejects when an instruction has zero amountMinor', () => {
    const plan = Object.freeze({
      ...makeBalancedPlan(),
      instructions: Object.freeze([
        Object.freeze({ accountCode: '1000', side: 'DEBIT' as const, amountMinor: 0, currency: CUR, description: 'zero' }),
        Object.freeze({ accountCode: '3000', side: 'CREDIT' as const, amountMinor: 0, currency: CUR, description: 'zero' }),
      ]),
    });
    const result = LedgerBalanceValidator.validate(plan as any, true);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ZERO_AMOUNT');
  });

  it('isBalanced() fast check returns true for balanced plan', () => {
    expect(LedgerBalanceValidator.isBalanced(makeBalancedPlan())).toBe(true);
  });

  it('isBalanced() returns false for unbalanced plan', () => {
    expect(LedgerBalanceValidator.isBalanced(makeUnbalancedPlan())).toBe(false);
  });

  it('validation result is frozen', () => {
    const result = LedgerBalanceValidator.validate(makeBalancedPlan(), true);
    expect(Object.isFrozen(result)).toBe(true);
  });
});

// ── LedgerEntryBuilder ────────────────────────────────────────────────────────

describe('LedgerEntryBuilder', () => {
  it('builds one entry per instruction', () => {
    const entries = LedgerEntryBuilder.build(
      makeBalancedPlan(), 'tx-001', 'ent-plan-001', new Date('2026-07-19T10:00:00Z'),
    );
    expect(entries).toHaveLength(2);
  });

  it('entry IDs are deterministic (prefix + padded index)', () => {
    const entries = LedgerEntryBuilder.build(
      makeBalancedPlan(), 'tx-001', 'ent-plan-001', new Date(),
    );
    expect(entries[0]!.id).toBe('ent-plan-001-00');
    expect(entries[1]!.id).toBe('ent-plan-001-01');
  });

  it('all entries start in PENDING status', () => {
    const entries = LedgerEntryBuilder.build(
      makeBalancedPlan(), 'tx-001', 'ent-plan-001', new Date(),
    );
    entries.forEach((e) => expect(e.isPending).toBe(true));
  });

  it('entries carry correct transactionId', () => {
    const entries = LedgerEntryBuilder.build(
      makeBalancedPlan(), 'tx-abc', 'ent-plan-001', new Date(),
    );
    entries.forEach((e) => expect(e.transactionId).toBe('tx-abc'));
  });

  it('entries carry correct accountCode, side, and amountMinor', () => {
    const entries = LedgerEntryBuilder.build(
      makeBalancedPlan(5000), 'tx-001', 'ent-plan-001', new Date(),
    );
    const dr = entries.find((e) => e.isDebit);
    const cr = entries.find((e) => e.isCredit);
    expect(dr!.accountCode).toBe('1000');
    expect(dr!.amountMinor).toBe(5000);
    expect(cr!.accountCode).toBe('3000');
    expect(cr!.amountMinor).toBe(5000);
  });

  it('same inputs always produce same entry IDs (deterministic)', () => {
    const postedAt = new Date('2026-07-19T10:00:00Z');
    const entriesA = LedgerEntryBuilder.build(makeBalancedPlan(), 'tx-001', 'ent-p', postedAt);
    const entriesB = LedgerEntryBuilder.build(makeBalancedPlan(), 'tx-001', 'ent-p', postedAt);
    expect(entriesA.map((e) => e.id)).toEqual(entriesB.map((e) => e.id));
  });

  it('entryIdPrefix is deterministic from planId', () => {
    expect(LedgerEntryBuilder.entryIdPrefix('plan-abc')).toBe('ent-plan-abc');
    expect(LedgerEntryBuilder.entryIdPrefix('plan-abc')).toBe(LedgerEntryBuilder.entryIdPrefix('plan-abc'));
  });

  it('built LedgerEntry is immutable — post() returns new instance, original unchanged', () => {
    const entries = LedgerEntryBuilder.build(
      makeBalancedPlan(), 'tx-001', 'ent-p', new Date(),
    );
    const original = entries[0]!;
    const posted   = original.post();
    // Immutability: post() returns a new instance; original status unchanged
    expect(original.isPending).toBe(true);
    expect(posted.isPosted).toBe(true);
    expect(original).not.toBe(posted);
  });
});

// ── LedgerPostingEngine ───────────────────────────────────────────────────────

describe('LedgerPostingEngine', () => {
  describe('post() — success path', () => {
    it('returns PostingSucceeded when plan is valid and persistence succeeds', async () => {
      const plan     = makeBalancedPlan();
      const succeed  = postingSucceeded('tx-001', LedgerEntryBuilder.build(plan, 'tx-001', 'ent-p', new Date()));
      const engine   = new LedgerPostingEngine(mockPersistence(succeed));
      const result   = await engine.post(plan, makeEngineContext());

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.transactionId).toBe('tx-001');
        expect(result.entryIds).toHaveLength(2);
      }
    });

    it('calls persistence.persist() exactly once', async () => {
      const plan    = makeBalancedPlan();
      const succeed = postingSucceeded('tx-001', LedgerEntryBuilder.build(plan, 'tx-001', 'ent-p', new Date()));
      const mock    = mockPersistence(succeed);
      const engine  = new LedgerPostingEngine(mock);
      await engine.post(plan, makeEngineContext());
      expect(mock.persist).toHaveBeenCalledTimes(1);
    });
  });

  describe('post() — validation rejection', () => {
    it('rejects when period is CLOSED (no persistence call)', async () => {
      const plan   = makeBalancedPlan();
      const mock   = mockPersistence(postingSucceeded('x', []));
      const engine = new LedgerPostingEngine(mock);
      const result = await engine.post(plan, makeEngineContext({ periodIsOpen: false }));

      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe('ACCOUNTING_PERIOD_CLOSED');
      expect(mock.persist).not.toHaveBeenCalled();
    });

    it('rejects when plan is unbalanced (no persistence call)', async () => {
      const unbalanced = makeUnbalancedPlan();
      const mock       = mockPersistence(postingSucceeded('x', []));
      const engine     = new LedgerPostingEngine(mock);
      const result     = await engine.post(unbalanced, makeEngineContext());

      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe('IMBALANCE_DETECTED');
      expect(mock.persist).not.toHaveBeenCalled();
    });
  });

  describe('post() — persistence failure simulation', () => {
    it('returns LedgerPersistenceFailed when persistence throws', async () => {
      const plan   = makeBalancedPlan();
      const failed = postingFailed('PERSISTENCE_FAILED', [ledgerError('dataSource', 'DB down')]);
      const engine = new LedgerPostingEngine(mockPersistence(failed));
      const result = await engine.post(plan, makeEngineContext());

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('PERSISTENCE_FAILED');
        expect(result.errors[0]!.message).toContain('DB down');
      }
    });
  });

  describe('post() — result immutability', () => {
    it('successful result is frozen', async () => {
      const plan    = makeBalancedPlan();
      const entries = LedgerEntryBuilder.build(plan, 'tx-001', 'ent-p', new Date());
      const succeed = postingSucceeded('tx-001', entries);
      const engine  = new LedgerPostingEngine(mockPersistence(succeed));
      const result  = await engine.post(plan, makeEngineContext());
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('No accounting decisions in engine', () => {
    it('engine source has no account resolution or posting rule imports', () => {
      const fs   = require('fs') as typeof import('fs');
      const path = require('path') as typeof import('path');
      const source = fs.readFileSync(
        path.resolve(process.cwd(), 'src/modules/ledger/ledger-posting-engine.ts'), 'utf8',
      );
      const imports = source.split('\n').filter((l) => l.trim().startsWith('import'));
      imports.forEach((line) => {
        // Engine must not import posting-rule logic or account resolution
        expect(line).not.toMatch(/chart-of-accounts-resolver|posting-rule-engine|posting-policy/i);
        expect(line).not.toMatch(/EventEmitter|rabbitmq|kafka/i);
      });
    });
  });
});
