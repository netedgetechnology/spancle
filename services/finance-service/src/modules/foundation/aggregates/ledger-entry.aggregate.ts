/**
 * ledger-entry.aggregate.ts
 *
 * LedgerEntry — a single immutable debit or credit in the financial ledger.
 *
 * IMMUTABILITY CONTRACT:
 *   Once a LedgerEntry reaches POSTED status, its financial fields
 *   (accountCode, amountMinor, currency, debitOrCredit, postedAt) are frozen.
 *   The only permitted mutation after posting is:
 *     - status: POSTED → REVERSED
 *     - reversedById: null → UUID of the reversing entry
 *
 * DOUBLE-ENTRY RULE:
 *   Exactly one of debitMinor or creditMinor is > 0 per entry.
 *   The aggregate enforces this at construction time.
 *   Balanced posting (∑ debits = ∑ credits) is enforced at the
 *   FinancialTransaction level, not per entry.
 *
 * All amounts are integer minor currency units. No DECIMAL/FLOAT.
 *
 * Pure domain aggregate — no TypeORM decorators.
 * Persistence: LedgerEntryEntity (separate file, this batch).
 */
import { Money }          from '../value-objects/money.value-object';
import { Currency }       from '../value-objects/currency.value-object';
import {
  type PostingStatus,
  assertLegalPostingTransition,
} from './posting-status';

export type DebitOrCredit = 'DEBIT' | 'CREDIT';

export interface LedgerEntryProps {
  id:                  string;
  tenantId:            string;
  transactionId:       string;
  accountCode:         string;
  accountingPeriod:    string;         // YYYY-MM
  debitOrCredit:       DebitOrCredit;
  amountMinor:         number;
  currency:            string;
  description:         string;
  postedAt:            Date;
  status:              PostingStatus;
  reversedById:        string | null;
  reversalOfId:        string | null;
  createdAt:           Date;
}

export class LedgerEntry {
  private readonly _props: Readonly<LedgerEntryProps>;

  private constructor(props: LedgerEntryProps) {
    LedgerEntry.validate(props);
    this._props = Object.freeze({ ...props });
  }

  // ── Factory ────────────────────────────────────────────────────────────────

  static create(props: Omit<LedgerEntryProps, 'status' | 'reversedById' | 'createdAt'>): LedgerEntry {
    return new LedgerEntry({
      ...props,
      status:       'PENDING',
      reversedById: null,
      createdAt:    new Date(),
    });
  }

  static reconstitute(props: LedgerEntryProps): LedgerEntry {
    return new LedgerEntry(props);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  get id():               string        { return this._props.id; }
  get tenantId():         string        { return this._props.tenantId; }
  get transactionId():    string        { return this._props.transactionId; }
  get accountCode():      string        { return this._props.accountCode; }
  get accountingPeriod(): string        { return this._props.accountingPeriod; }
  get debitOrCredit():    DebitOrCredit { return this._props.debitOrCredit; }
  get amountMinor():      number        { return this._props.amountMinor; }
  get currency():         string        { return this._props.currency; }
  get description():      string        { return this._props.description; }
  get postedAt():         Date          { return this._props.postedAt; }
  get status():           PostingStatus { return this._props.status; }
  get reversedById():     string | null { return this._props.reversedById; }
  get reversalOfId():     string | null { return this._props.reversalOfId; }
  get createdAt():        Date          { return this._props.createdAt; }

  get isDebit():    boolean { return this._props.debitOrCredit === 'DEBIT'; }
  get isCredit():   boolean { return this._props.debitOrCredit === 'CREDIT'; }
  get isPosted():   boolean { return this._props.status === 'POSTED'; }
  get isReversed(): boolean { return this._props.status === 'REVERSED'; }
  get isPending():  boolean { return this._props.status === 'PENDING'; }
  get isReversalEntry(): boolean { return this._props.reversalOfId !== null; }

  get money(): Money {
    return Money.of(this._props.amountMinor, this._props.currency);
  }

  get debitMinor():  number { return this.isDebit  ? this._props.amountMinor : 0; }
  get creditMinor(): number { return this.isCredit ? this._props.amountMinor : 0; }

  // ── Commands ───────────────────────────────────────────────────────────────

  /** Marks this entry as POSTED. Returns a new immutable instance. */
  post(): LedgerEntry {
    assertLegalPostingTransition(this._props.status, 'POSTED');
    return new LedgerEntry({ ...this._props, status: 'POSTED' });
  }

  /** Marks this entry as FAILED. Returns a new immutable instance. */
  fail(reason?: string): LedgerEntry {
    assertLegalPostingTransition(this._props.status, 'FAILED');
    return new LedgerEntry({
      ...this._props,
      status:      'FAILED',
      description: reason ? `${this._props.description} [FAILED: ${reason}]` : this._props.description,
    });
  }

  /**
   * Marks this entry as REVERSED, linking the reversing entry.
   * Returns a new immutable instance.
   */
  reverse(reversedById: string): LedgerEntry {
    assertLegalPostingTransition(this._props.status, 'REVERSED');
    return new LedgerEntry({ ...this._props, status: 'REVERSED', reversedById });
  }

  /**
   * Creates the mirror reversal entry (opposite debit/credit, same amount).
   * The new entry starts in PENDING status.
   */
  createReversalEntry(newId: string): LedgerEntry {
    if (!this.isPosted) {
      throw new Error(`Cannot create reversal of a non-POSTED entry (${this._props.id} is ${this._props.status})`);
    }
    return new LedgerEntry({
      id:               newId,
      tenantId:         this._props.tenantId,
      transactionId:    this._props.transactionId,
      accountCode:      this._props.accountCode,
      accountingPeriod: this._props.accountingPeriod,
      debitOrCredit:    this.isDebit ? 'CREDIT' : 'DEBIT',
      amountMinor:      this._props.amountMinor,
      currency:         this._props.currency,
      description:      `Reversal of ${this._props.id}: ${this._props.description}`,
      postedAt:         new Date(),
      status:           'PENDING',
      reversedById:     null,
      reversalOfId:     this._props.id,
      createdAt:        new Date(),
    });
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON(): LedgerEntryProps {
    return { ...this._props };
  }

  // ── Private validation ────────────────────────────────────────────────────

  private static validate(props: LedgerEntryProps): void {
    if (!props.id)              throw new Error('LedgerEntry: id is required');
    if (!props.tenantId)        throw new Error('LedgerEntry: tenantId is required');
    if (!props.transactionId)   throw new Error('LedgerEntry: transactionId is required');
    if (!props.accountCode)     throw new Error('LedgerEntry: accountCode is required');
    if (!props.description)     throw new Error('LedgerEntry: description is required');

    if (!Number.isInteger(props.amountMinor) || props.amountMinor <= 0) {
      throw new Error(`LedgerEntry: amountMinor must be a positive integer; received ${props.amountMinor}`);
    }

    // Currency validation via Currency value object (throws if unsupported)
    Currency.of(props.currency);

    // Accounting period format YYYY-MM
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(props.accountingPeriod)) {
      throw new Error(`LedgerEntry: invalid accountingPeriod "${props.accountingPeriod}"`);
    }
  }
}
