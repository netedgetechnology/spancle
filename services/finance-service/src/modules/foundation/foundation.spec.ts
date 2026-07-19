/**
 * foundation.spec.ts
 *
 * Finance Foundation unit tests.
 * Pure domain — no database, no NestJS, no transport, no Commercial imports.
 *
 * Covers:
 *   Currency value object
 *   Money value object (arithmetic, bps, immutability)
 *   PostingStatus lifecycle
 *   AccountingPeriod aggregate
 *   LedgerEntry aggregate
 *   FinancialTransaction aggregate (balance invariant, commit, reversal)
 *   Finance domain events (structure)
 */
import { Currency } from './value-objects/currency.value-object';
import { Money }    from './value-objects/money.value-object';
import {
  assertLegalPostingTransition,
  isLegalPostingTransition,
  isTerminalPostingStatus,
} from './aggregates/posting-status';
import { AccountingPeriod } from './aggregates/accounting-period.aggregate';
import { LedgerEntry }      from './aggregates/ledger-entry.aggregate';
import {
  FinancialTransaction,
  type FinancialTransactionType,
} from './aggregates/financial-transaction.aggregate';
import {
  FinanceFoundationEvents,
} from './events/foundation.events';

// ── Helpers ───────────────────────────────────────────────────────────────────

let idSeq = 0;
const uid  = () => `${String(++idSeq).padStart(8, '0')}-0000-0000-0000-000000000000`;
const tid  = () => 'tenant-001';

function makeEntry(
  overrides: Partial<Parameters<typeof LedgerEntry.create>[0]> = {},
) {
  return LedgerEntry.create({
    id:               uid(),
    tenantId:         tid(),
    transactionId:    uid(),
    accountCode:      '2000',
    accountingPeriod: '2026-07',
    debitOrCredit:    'DEBIT',
    amountMinor:      5000,
    currency:         'GBP',
    description:      'Test entry',
    postedAt:         new Date('2026-07-15T10:00:00Z'),
    reversalOfId:     null,
    ...overrides,
  });
}

function makeTransaction(
  type: FinancialTransactionType = 'COMMERCIAL_DECISION',
  entries: LedgerEntry[] = [],
) {
  return FinancialTransaction.create({
    id:               uid(),
    tenantId:         tid(),
    reference:        'FT-202607-00001',
    transactionType:  type,
    accountingPeriod: '2026-07',
    sourceType:       'commercial_decision',
    sourceId:         uid(),
    description:      'Test transaction',
  }, entries);
}

function makeBalancedTransaction(): FinancialTransaction {
  const dr = makeEntry({ debitOrCredit: 'DEBIT',  amountMinor: 5000, accountCode: '1000' });
  const cr = makeEntry({ debitOrCredit: 'CREDIT', amountMinor: 5000, accountCode: '4000' });
  let tx = makeTransaction();
  tx = tx.addEntry(dr);
  tx = tx.addEntry(cr);
  return tx;
}

// =============================================================================
// Currency value object
// =============================================================================

describe('Currency', () => {
  it('creates a valid currency from uppercase code', () => {
    const c = Currency.of('GBP');
    expect(c.code).toBe('GBP');
  });

  it('normalizes lowercase input to uppercase', () => {
    const c = Currency.of('gbp');
    expect(c.code).toBe('GBP');
  });

  it('throws for unknown currency code', () => {
    expect(() => Currency.of('XYZ')).toThrow(/Unsupported currency/);
  });

  it('throws for non-3-char code', () => {
    expect(() => Currency.of('GB')).toThrow(/3 characters/);
  });

  it('minorUnitScale is 100 for GBP, INR, USD', () => {
    expect(Currency.of('GBP').minorUnitScale).toBe(100);
    expect(Currency.of('INR').minorUnitScale).toBe(100);
  });

  it('equals returns true for same code', () => {
    expect(Currency.of('GBP').equals(Currency.of('GBP'))).toBe(true);
  });

  it('equals returns false for different codes', () => {
    expect(Currency.of('GBP').equals(Currency.of('USD'))).toBe(false);
  });

  it('isSupported returns true for known codes', () => {
    expect(Currency.isSupported('INR')).toBe(true);
  });

  it('toJSON returns the code string', () => {
    expect(JSON.stringify(Currency.of('GBP'))).toBe('"GBP"');
  });
});

// =============================================================================
// Money value object
// =============================================================================

describe('Money', () => {
  describe('creation', () => {
    it('creates from integer minor units', () => {
      const m = Money.of(5000, 'GBP');
      expect(m.amountMinor).toBe(5000);
      expect(m.currencyCode).toBe('GBP');
    });

    it('throws for non-integer amount', () => {
      expect(() => Money.of(99.5, 'GBP')).toThrow(/integer/);
    });

    it('ZERO factory returns zero amount', () => {
      expect(Money.ZERO('GBP').isZero()).toBe(true);
    });
  });

  describe('arithmetic', () => {
    it('add produces correct sum', () => {
      const a = Money.of(3000, 'GBP');
      const b = Money.of(2000, 'GBP');
      expect(a.add(b).amountMinor).toBe(5000);
    });

    it('subtract produces correct difference', () => {
      const a = Money.of(5000, 'GBP');
      const b = Money.of(2000, 'GBP');
      expect(a.subtract(b).amountMinor).toBe(3000);
    });

    it('add throws on currency mismatch', () => {
      expect(() => Money.of(100, 'GBP').add(Money.of(100, 'USD'))).toThrow(/mismatch/);
    });

    it('multiplyByInt scales correctly', () => {
      expect(Money.of(1000, 'GBP').multiplyByInt(3).amountMinor).toBe(3000);
    });

    it('multiplyByInt throws for non-integer factor', () => {
      expect(() => Money.of(1000, 'GBP').multiplyByInt(1.5)).toThrow(/integer/);
    });

    it('divideByInt floors correctly', () => {
      // 100 / 3 = 33.33… → floors to 33
      expect(Money.of(100, 'GBP').divideByInt(3).amountMinor).toBe(33);
    });

    it('divideByInt throws for zero divisor', () => {
      expect(() => Money.of(1000, 'GBP').divideByInt(0)).toThrow(/positive integer/);
    });

    it('negate produces negative amount', () => {
      expect(Money.of(500, 'GBP').negate().amountMinor).toBe(-500);
    });

    it('abs returns positive', () => {
      expect(Money.of(-300, 'GBP').abs().amountMinor).toBe(300);
    });
  });

  describe('applyBps', () => {
    it('applies 20% (2000 bps) to 10000 → 2000', () => {
      expect(Money.of(10000, 'GBP').applyBps(2000).amountMinor).toBe(2000);
    });

    it('floors fractional minor units', () => {
      // 10000 * 1999 / 10000 = 1999.0 exactly — no rounding needed
      // 10001 * 1999 / 10000 = 1999.1999 → 1999
      expect(Money.of(10001, 'GBP').applyBps(1999).amountMinor).toBe(1999);
    });

    it('0 bps returns zero', () => {
      expect(Money.of(10000, 'GBP').applyBps(0).amountMinor).toBe(0);
    });

    it('throws for non-integer bps', () => {
      expect(() => Money.of(1000, 'GBP').applyBps(10.5)).toThrow(/non-negative integer/);
    });
  });

  describe('comparison', () => {
    it('greaterThan and lessThan work correctly', () => {
      const big   = Money.of(1000, 'GBP');
      const small = Money.of(500,  'GBP');
      expect(big.greaterThan(small)).toBe(true);
      expect(small.lessThan(big)).toBe(true);
    });

    it('equals compares by value and currency', () => {
      expect(Money.of(500, 'GBP').equals(Money.of(500, 'GBP'))).toBe(true);
      expect(Money.of(500, 'GBP').equals(Money.of(500, 'USD'))).toBe(false);
    });
  });

  describe('immutability', () => {
    it('arithmetic always returns a new instance', () => {
      const a = Money.of(1000, 'GBP');
      const b = a.add(Money.of(500, 'GBP'));
      expect(a.amountMinor).toBe(1000);   // unchanged
      expect(b.amountMinor).toBe(1500);
    });
  });

  describe('sum', () => {
    it('sums array correctly', () => {
      const result = Money.sum(
        [Money.of(1000, 'GBP'), Money.of(2000, 'GBP'), Money.of(3000, 'GBP')],
        'GBP',
      );
      expect(result.amountMinor).toBe(6000);
    });

    it('returns zero for empty array', () => {
      expect(Money.sum([], 'GBP').amountMinor).toBe(0);
    });
  });
});

// =============================================================================
// PostingStatus
// =============================================================================

describe('PostingStatus', () => {
  it('PENDING → POSTED is legal', () => {
    expect(isLegalPostingTransition('PENDING', 'POSTED')).toBe(true);
  });

  it('PENDING → FAILED is legal', () => {
    expect(isLegalPostingTransition('PENDING', 'FAILED')).toBe(true);
  });

  it('POSTED → REVERSED is legal', () => {
    expect(isLegalPostingTransition('POSTED', 'REVERSED')).toBe(true);
  });

  it('POSTED → PENDING is illegal', () => {
    expect(isLegalPostingTransition('POSTED', 'PENDING')).toBe(false);
  });

  it('REVERSED → anything is illegal (terminal)', () => {
    expect(isLegalPostingTransition('REVERSED', 'POSTED')).toBe(false);
    expect(isLegalPostingTransition('REVERSED', 'PENDING')).toBe(false);
  });

  it('FAILED → anything is illegal (terminal)', () => {
    expect(isLegalPostingTransition('FAILED', 'POSTED')).toBe(false);
  });

  it('assertLegalPostingTransition throws for illegal transition', () => {
    expect(() => assertLegalPostingTransition('REVERSED', 'POSTED')).toThrow(/Illegal/);
  });

  it('isTerminalPostingStatus returns true for REVERSED and FAILED', () => {
    expect(isTerminalPostingStatus('REVERSED')).toBe(true);
    expect(isTerminalPostingStatus('FAILED')).toBe(true);
    expect(isTerminalPostingStatus('PENDING')).toBe(false);
  });
});

// =============================================================================
// AccountingPeriod aggregate
// =============================================================================

describe('AccountingPeriod', () => {
  it('opens with OPEN status', () => {
    const p = AccountingPeriod.open('tenant-001', '2026-07');
    expect(p.status).toBe('OPEN');
    expect(p.isOpen).toBe(true);
    expect(p.period).toBe('2026-07');
  });

  it('throws for invalid period format', () => {
    expect(() => AccountingPeriod.open('t', '2026-7')).toThrow(/YYYY-MM/);
    expect(() => AccountingPeriod.open('t', '202607')).toThrow(/YYYY-MM/);
    expect(() => AccountingPeriod.open('t', '2026-13')).toThrow(/YYYY-MM/);
  });

  it('assertAcceptsPosting passes for date in the period', () => {
    const p = AccountingPeriod.open('t', '2026-07');
    expect(() => p.assertAcceptsPosting(new Date('2026-07-15T00:00:00Z'))).not.toThrow();
  });

  it('assertAcceptsPosting throws for date outside the period', () => {
    const p = AccountingPeriod.open('t', '2026-07');
    expect(() => p.assertAcceptsPosting(new Date('2026-08-01T00:00:00Z'))).toThrow(/outside period/);
  });

  it('assertAcceptsPosting throws when period is not OPEN', () => {
    const p = AccountingPeriod.open('t', '2026-07');
    p.close();
    expect(() => p.assertAcceptsPosting(new Date('2026-07-15T00:00:00Z'))).toThrow(/CLOSED/);
  });

  it('OPEN → CLOSED transition succeeds', () => {
    const p = AccountingPeriod.open('t', '2026-07');
    p.close();
    expect(p.status).toBe('CLOSED');
    expect(p.isClosed).toBe(true);
  });

  it('CLOSED → LOCKED transition succeeds', () => {
    const p = AccountingPeriod.open('t', '2026-07');
    p.close();
    p.lock();
    expect(p.status).toBe('LOCKED');
    expect(p.isLocked).toBe(true);
  });

  it('LOCKED → CLOSED is illegal', () => {
    const p = AccountingPeriod.open('t', '2026-07');
    p.close();
    p.lock();
    expect(() => p.close()).toThrow(/Illegal/);
  });

  it('nextPeriodKey returns correct next month', () => {
    expect(AccountingPeriod.open('t', '2026-07').nextPeriodKey()).toBe('2026-08');
    expect(AccountingPeriod.open('t', '2026-12').nextPeriodKey()).toBe('2027-01');
  });

  it('year and month getters are correct', () => {
    const p = AccountingPeriod.open('t', '2026-07');
    expect(p.year).toBe(2026);
    expect(p.month).toBe(7);
  });
});

// =============================================================================
// LedgerEntry aggregate
// =============================================================================

describe('LedgerEntry', () => {
  it('creates with PENDING status', () => {
    const e = makeEntry();
    expect(e.status).toBe('PENDING');
    expect(e.isPending).toBe(true);
  });

  it('throws for non-positive amountMinor', () => {
    expect(() => makeEntry({ amountMinor: 0 })).toThrow(/positive integer/);
    expect(() => makeEntry({ amountMinor: -1 })).toThrow(/positive integer/);
  });

  it('throws for unsupported currency', () => {
    expect(() => makeEntry({ currency: 'XXX' })).toThrow(/Unsupported currency/);
  });

  it('throws for invalid accountingPeriod', () => {
    expect(() => makeEntry({ accountingPeriod: '202607' })).toThrow(/invalid accountingPeriod/);
  });

  it('post() transitions PENDING → POSTED', () => {
    const posted = makeEntry().post();
    expect(posted.status).toBe('POSTED');
    expect(posted.isPosted).toBe(true);
  });

  it('post() returns a new immutable instance', () => {
    const original = makeEntry();
    const posted   = original.post();
    expect(original.status).toBe('PENDING');
    expect(posted.status).toBe('POSTED');
  });

  it('fail() transitions PENDING → FAILED', () => {
    const failed = makeEntry().fail('period closed');
    expect(failed.status).toBe('FAILED');
  });

  it('reverse() transitions POSTED → REVERSED', () => {
    const reversalId = uid();
    const reversed   = makeEntry().post().reverse(reversalId);
    expect(reversed.status).toBe('REVERSED');
    expect(reversed.reversedById).toBe(reversalId);
  });

  it('reverse() throws on non-POSTED entry', () => {
    expect(() => makeEntry().reverse(uid())).toThrow(/Illegal/);
  });

  it('createReversalEntry() produces opposite sign entry', () => {
    const original = makeEntry({ debitOrCredit: 'DEBIT', amountMinor: 5000 }).post();
    const reversal = original.createReversalEntry(uid());
    expect(reversal.debitOrCredit).toBe('CREDIT');
    expect(reversal.amountMinor).toBe(5000);
    expect(reversal.status).toBe('PENDING');
    expect(reversal.reversalOfId).toBe(original.id);
  });

  it('createReversalEntry() throws on non-POSTED entry', () => {
    expect(() => makeEntry().createReversalEntry(uid())).toThrow(/non-POSTED/);
  });

  it('debitMinor and creditMinor helpers work correctly', () => {
    const dr = makeEntry({ debitOrCredit: 'DEBIT',  amountMinor: 1000 });
    const cr = makeEntry({ debitOrCredit: 'CREDIT', amountMinor: 2000 });
    expect(dr.debitMinor).toBe(1000);
    expect(dr.creditMinor).toBe(0);
    expect(cr.debitMinor).toBe(0);
    expect(cr.creditMinor).toBe(2000);
  });

  it('money getter returns correct Money value object', () => {
    const e = makeEntry({ amountMinor: 5000, currency: 'GBP' });
    expect(e.money.amountMinor).toBe(5000);
    expect(e.money.currencyCode).toBe('GBP');
  });

  it('toJSON serializes all props', () => {
    const e = makeEntry();
    const j = e.toJSON();
    expect(j.id).toBe(e.id);
    expect(j.status).toBe('PENDING');
  });
});

// =============================================================================
// FinancialTransaction aggregate
// =============================================================================

describe('FinancialTransaction', () => {
  describe('creation', () => {
    it('creates with DRAFT status and empty entries', () => {
      const tx = makeTransaction();
      expect(tx.isDraft).toBe(true);
      expect(tx.entries.length).toBe(0);
    });
  });

  describe('addEntry', () => {
    it('adds an entry to a DRAFT transaction', () => {
      const e  = makeEntry();
      const tx = makeTransaction().addEntry(e);
      expect(tx.entries.length).toBe(1);
    });

    it('returns a new instance — original unchanged', () => {
      const original = makeTransaction();
      const updated  = original.addEntry(makeEntry());
      expect(original.entries.length).toBe(0);
      expect(updated.entries.length).toBe(1);
    });

    it('throws when adding to a committed transaction', () => {
      const committed = makeBalancedTransaction().commit();
      expect(() => committed.addEntry(makeEntry())).toThrow(/COMMITTED/);
    });
  });

  describe('balance invariant', () => {
    it('isBalanced returns true for balanced entries', () => {
      expect(makeBalancedTransaction().isBalanced()).toBe(true);
    });

    it('isBalanced returns false for unbalanced entries', () => {
      const tx = makeTransaction().addEntry(makeEntry({ amountMinor: 5000, debitOrCredit: 'DEBIT' }));
      expect(tx.isBalanced()).toBe(false);
    });

    it('assertBalanced throws describing the currency imbalance', () => {
      const tx = makeTransaction().addEntry(makeEntry({ amountMinor: 5000, debitOrCredit: 'DEBIT' }));
      expect(() => tx.assertBalanced()).toThrow(/not balanced/);
    });

    it('assertBalanced passes for balanced transaction', () => {
      expect(() => makeBalancedTransaction().assertBalanced()).not.toThrow();
    });
  });

  describe('commit', () => {
    it('commit() transitions DRAFT → COMMITTED', () => {
      const committed = makeBalancedTransaction().commit();
      expect(committed.isCommitted).toBe(true);
      expect(committed.committedAt).not.toBeNull();
    });

    it('commit() posts all entries', () => {
      const committed = makeBalancedTransaction().commit();
      committed.entries.forEach((e) => expect(e.isPosted).toBe(true));
    });

    it('commit() throws on unbalanced transaction', () => {
      const tx = makeTransaction().addEntry(makeEntry({ amountMinor: 999, debitOrCredit: 'DEBIT' }));
      expect(() => tx.commit()).toThrow(/not balanced/);
    });

    it('commit() throws on empty transaction', () => {
      expect(() => makeTransaction().commit()).toThrow(/no ledger entries/);
    });

    it('commit() returns a new immutable instance', () => {
      const draft     = makeBalancedTransaction();
      const committed = draft.commit();
      expect(draft.isDraft).toBe(true);
      expect(committed.isCommitted).toBe(true);
    });
  });

  describe('fail', () => {
    it('fail() transitions DRAFT → FAILED', () => {
      const failed = makeTransaction().fail('period closed');
      expect(failed.status).toBe('FAILED');
    });

    it('fail() marks all entries as FAILED', () => {
      const tx     = makeBalancedTransaction();
      const failed = tx.fail('test');
      failed.entries.forEach((e) => expect(e.status).toBe('FAILED'));
    });
  });

  describe('reversal', () => {
    it('markReversed() transitions COMMITTED → REVERSED', () => {
      const committed = makeBalancedTransaction().commit();
      const reversed  = committed.markReversed(uid());
      expect(reversed.isReversed).toBe(true);
    });

    it('markReversed() returns new instance with all entries REVERSED', () => {
      const committed = makeBalancedTransaction().commit();
      const reversed  = committed.markReversed(uid());
      reversed.entries.forEach((e) => expect(e.isReversed).toBe(true));
    });

    it('markReversed() on DRAFT throws', () => {
      expect(() => makeTransaction().markReversed(uid())).toThrow(/Illegal/);
    });
  });

  describe('totals', () => {
    it('totalDebits and totalCredits are correct', () => {
      const committed = makeBalancedTransaction().commit();
      expect(committed.totalDebits('GBP').amountMinor).toBe(5000);
      expect(committed.totalCredits('GBP').amountMinor).toBe(5000);
    });
  });

  describe('toJSON', () => {
    it('serializes props and entries', () => {
      const json = makeBalancedTransaction().commit().toJSON();
      expect(json.status).toBe('COMMITTED');
      expect(Array.isArray(json.entries)).toBe(true);
      expect(json.entries.length).toBe(2);
    });
  });
});

// =============================================================================
// Finance domain events
// =============================================================================

describe('FinanceFoundationEvents', () => {
  it('all event types start with spancle.finance prefix', () => {
    Object.values(FinanceFoundationEvents).forEach((evt) => {
      expect(evt).toMatch(/^spancle\.finance\./);
    });
  });

  it('contains transaction lifecycle events', () => {
    expect(FinanceFoundationEvents.TRANSACTION_CREATED).toBeDefined();
    expect(FinanceFoundationEvents.TRANSACTION_COMMITTED).toBeDefined();
    expect(FinanceFoundationEvents.TRANSACTION_REVERSED).toBeDefined();
  });

  it('contains accounting period lifecycle events', () => {
    expect(FinanceFoundationEvents.PERIOD_OPENED).toBeDefined();
    expect(FinanceFoundationEvents.PERIOD_CLOSED).toBeDefined();
    expect(FinanceFoundationEvents.PERIOD_LOCKED).toBeDefined();
  });

  it('contains ledger entry lifecycle events', () => {
    expect(FinanceFoundationEvents.ENTRY_PENDING).toBeDefined();
    expect(FinanceFoundationEvents.ENTRY_POSTED).toBeDefined();
    expect(FinanceFoundationEvents.ENTRY_REVERSED).toBeDefined();
  });
});

// =============================================================================
// No Commercial / transport dependency
// =============================================================================

describe('No external dependencies', () => {
  const fs   = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');

  const foundationFiles = [
    'src/modules/foundation/aggregates/financial-transaction.aggregate.ts',
    'src/modules/foundation/aggregates/ledger-entry.aggregate.ts',
    'src/modules/foundation/aggregates/accounting-period.aggregate.ts',
    'src/modules/foundation/aggregates/posting-status.ts',
    'src/modules/foundation/value-objects/money.value-object.ts',
    'src/modules/foundation/value-objects/currency.value-object.ts',
    'src/modules/foundation/events/foundation.events.ts',
  ];

  foundationFiles.forEach((file) => {
    it(`${path.basename(file)} has no Commercial, HTTP, or transport imports`, () => {
      const source      = fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
      const importLines = source.split('\n').filter((l) => l.trim().startsWith('import '));
      importLines.forEach((line) => {
        expect(line).not.toMatch(/saas-platform|commercial|platform-integration/i);
        expect(line).not.toMatch(/@nestjs\/axios|HttpModule|rabbitmq|kafka|amqp/i);
        expect(line).not.toMatch(/EventEmitter2|@nestjs\/event-emitter/i);
      });
    });
  });
});
