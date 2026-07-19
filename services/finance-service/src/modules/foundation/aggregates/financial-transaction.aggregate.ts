/**
 * financial-transaction.aggregate.ts
 *
 * FinancialTransaction — a balanced double-entry aggregate root containing
 * one or more LedgerEntries.
 *
 * BALANCE INVARIANT:
 *   ∑ debitMinor = ∑ creditMinor for all entries in the same currency.
 *   This is enforced before the transaction can be committed.
 *
 * IMMUTABILITY CONTRACT:
 *   Once committed (status = COMMITTED), the transaction is immutable.
 *   Corrections are made via a new reversing transaction — never by mutation.
 *
 * SOURCE LINKAGE:
 *   sourceType + sourceId correlate this transaction to the originating
 *   business event (e.g. a CommercialDecisionContract.decisionId).
 *
 * Pure domain aggregate — no TypeORM, no HTTP, no transport.
 */
import { Money }        from '../value-objects/money.value-object';
import { LedgerEntry }  from './ledger-entry.aggregate';
import {
  type PostingStatus,
  assertLegalPostingTransition,
} from './posting-status';

export type FinancialTransactionType =
  | 'COMMERCIAL_DECISION'    // originated from a Commercial Engine decision
  | 'SUBSCRIPTION_CHARGE'    // recurring subscription billing
  | 'REFUND'                 // refund of a prior charge
  | 'ADJUSTMENT'             // manual adjustment entry
  | 'REVERSAL'               // reversal of a prior transaction
  | 'OPENING_BALANCE'        // period opening balance entry
  | 'CLOSING_BALANCE';       // period closing snapshot

export type TransactionStatus = 'DRAFT' | 'COMMITTED' | 'REVERSED' | 'FAILED';

const TRANSACTION_STATUS_TRANSITIONS: Record<TransactionStatus, readonly TransactionStatus[]> = {
  DRAFT:     ['COMMITTED', 'FAILED'],
  COMMITTED: ['REVERSED'],
  REVERSED:  [],
  FAILED:    [],
} as const;

export interface FinancialTransactionProps {
  id:               string;
  tenantId:         string;
  reference:        string;      // human-readable JNL-YYYYMM-NNNNN style
  transactionType:  FinancialTransactionType;
  accountingPeriod: string;      // YYYY-MM
  sourceType:       string | null;
  sourceId:         string | null;
  description:      string;
  status:           TransactionStatus;
  reversedById:     string | null;
  reversalOfId:     string | null;
  createdAt:        Date;
  committedAt:      Date | null;
}

export class FinancialTransaction {
  private readonly _props:   Readonly<FinancialTransactionProps>;
  private readonly _entries: LedgerEntry[];

  private constructor(
    props:   FinancialTransactionProps,
    entries: LedgerEntry[],
  ) {
    this._props   = Object.freeze({ ...props });
    this._entries = entries;
  }

  // ── Factory ────────────────────────────────────────────────────────────────

  static create(
    props:   Omit<FinancialTransactionProps, 'status' | 'reversedById' | 'reversalOfId' | 'createdAt' | 'committedAt'>,
    entries: LedgerEntry[] = [],
  ): FinancialTransaction {
    return new FinancialTransaction(
      {
        ...props,
        status:       'DRAFT',
        reversedById: null,
        reversalOfId: null,
        createdAt:    new Date(),
        committedAt:  null,
      },
      entries,
    );
  }

  static reconstitute(
    props:   FinancialTransactionProps,
    entries: LedgerEntry[],
  ): FinancialTransaction {
    return new FinancialTransaction(props, entries);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  get id():               string                    { return this._props.id; }
  get tenantId():         string                    { return this._props.tenantId; }
  get reference():        string                    { return this._props.reference; }
  get transactionType():  FinancialTransactionType  { return this._props.transactionType; }
  get accountingPeriod(): string                    { return this._props.accountingPeriod; }
  get sourceType():       string | null             { return this._props.sourceType; }
  get sourceId():         string | null             { return this._props.sourceId; }
  get description():      string                    { return this._props.description; }
  get status():           TransactionStatus         { return this._props.status; }
  get reversedById():     string | null             { return this._props.reversedById; }
  get reversalOfId():     string | null             { return this._props.reversalOfId; }
  get createdAt():        Date                      { return this._props.createdAt; }
  get committedAt():      Date | null               { return this._props.committedAt; }

  get entries():  ReadonlyArray<LedgerEntry> { return this._entries; }
  get isDraft():  boolean { return this._props.status === 'DRAFT'; }
  get isCommitted(): boolean { return this._props.status === 'COMMITTED'; }
  get isReversed(): boolean { return this._props.status === 'REVERSED'; }
  get isReversal(): boolean { return this._props.reversalOfId !== null; }

  // ── Balance invariant ──────────────────────────────────────────────────────

  /**
   * Asserts that ∑ debitMinor = ∑ creditMinor for each currency.
   * Throws on imbalance. Must pass before commit().
   */
  assertBalanced(): void {
    const byCurrency = new Map<string, { dr: number; cr: number }>();
    for (const entry of this._entries) {
      const cur = entry.currency;
      const acc = getOrCreate(byCurrency, cur);
      if (entry.isDebit)  acc.dr += entry.amountMinor;
      if (entry.isCredit) acc.cr += entry.amountMinor;
    }
    for (const [cur, { dr, cr }] of byCurrency) {
      if (dr !== cr) {
        throw new Error(
          `FinancialTransaction ${this._props.id} is not balanced in ${cur}: ` +
          `debits=${dr} credits=${cr} (difference=${Math.abs(dr - cr)})`,
        );
      }
    }
  }

  /**
   * Returns true when the transaction is balanced.
   * Does not throw — use assertBalanced() when you need an exception.
   */
  isBalanced(): boolean {
    try { this.assertBalanced(); return true; }
    catch { return false; }
  }

  /**
   * Returns total debits in the given currency.
   */
  totalDebits(currencyCode: string): Money {
    const total = this._entries
      .filter((e) => e.isDebit && e.currency === currencyCode)
      .reduce((s, e) => s + e.amountMinor, 0);
    return Money.of(total, currencyCode);
  }

  /**
   * Returns total credits in the given currency.
   */
  totalCredits(currencyCode: string): Money {
    const total = this._entries
      .filter((e) => e.isCredit && e.currency === currencyCode)
      .reduce((s, e) => s + e.amountMinor, 0);
    return Money.of(total, currencyCode);
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  /**
   * Adds a ledger entry to a DRAFT transaction.
   * Returns a new FinancialTransaction with the entry appended.
   */
  addEntry(entry: LedgerEntry): FinancialTransaction {
    if (!this.isDraft) {
      throw new Error(`Cannot add entries to a ${this._props.status} transaction`);
    }
    return new FinancialTransaction(
      { ...this._props },
      [...this._entries, entry],
    );
  }

  /**
   * Commits the transaction (DRAFT → COMMITTED).
   * Asserts balance before committing.
   * Returns a new FinancialTransaction with all entries in POSTED status.
   */
  commit(committedAt: Date = new Date()): FinancialTransaction {
    this.assertTransition('COMMITTED');
    if (this._entries.length === 0) {
      throw new Error('Cannot commit a transaction with no ledger entries');
    }
    this.assertBalanced();
    const postedEntries = this._entries.map((e) => e.post());
    return new FinancialTransaction(
      { ...this._props, status: 'COMMITTED', committedAt },
      postedEntries,
    );
  }

  /**
   * Marks this transaction as FAILED (DRAFT → FAILED).
   * Returns a new FinancialTransaction.
   */
  fail(reason: string): FinancialTransaction {
    this.assertTransition('FAILED');
    const failedEntries = this._entries.map((e) => e.fail(reason));
    return new FinancialTransaction(
      {
        ...this._props,
        status:      'FAILED',
        description: `${this._props.description} [FAILED: ${reason}]`,
      },
      failedEntries,
    );
  }

  /**
   * Marks this transaction as REVERSED, linking the reversing transaction.
   * Returns a new immutable FinancialTransaction.
   */
  markReversed(reversedById: string): FinancialTransaction {
    this.assertTransition('REVERSED');
    const reversedEntries = this._entries.map((e) => e.reverse(reversedById));
    return new FinancialTransaction(
      { ...this._props, status: 'REVERSED', reversedById },
      reversedEntries,
    );
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON() {
    return {
      ...this._props,
      createdAt:   this._props.createdAt.toISOString(),
      committedAt: this._props.committedAt?.toISOString() ?? null,
      entries:     this._entries.map((e) => e.toJSON()),
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private assertTransition(to: TransactionStatus): void {
    const allowed = TRANSACTION_STATUS_TRANSITIONS[this._props.status];
    if (!(allowed as readonly string[]).includes(to)) {
      throw new Error(
        `Illegal FinancialTransaction transition: ${this._props.status} → ${to}`,
      );
    }
  }
}

// Helper for balance accumulation
function getOrCreate(
  map: Map<string, { dr: number; cr: number }>,
  key: string,
): { dr: number; cr: number } {
  if (!map.has(key)) map.set(key, { dr: 0, cr: 0 });
  return map.get(key)!;
}
