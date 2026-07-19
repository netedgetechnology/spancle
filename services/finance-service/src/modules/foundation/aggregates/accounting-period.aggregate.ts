/**
 * accounting-period.aggregate.ts
 *
 * AccountingPeriod — bounded time window that governs which ledger postings
 * are accepted at a given point in time.
 *
 * Represented as YYYY-MM (calendar month).
 * One period is OPEN per tenant at any time.
 * Closed / locked periods reject all new postings.
 *
 * This is a pure domain aggregate — no TypeORM decorators.
 * Persistence is handled by the AccountingPeriodEntity (separate file).
 *
 * Lifecycle:
 *   OPEN → CLOSING → CLOSED → LOCKED
 *
 * Rules enforced here:
 *   1. YYYY-MM format only.
 *   2. Posting allowed only into OPEN periods.
 *   3. CLOSED and LOCKED periods are immutable.
 *   4. Transitions are one-way (no reopening at aggregate level).
 */

export type AccountingPeriodStatus = 'OPEN' | 'CLOSING' | 'CLOSED' | 'LOCKED';

export const ACCOUNTING_PERIOD_TRANSITIONS: Record<AccountingPeriodStatus, readonly AccountingPeriodStatus[]> = {
  OPEN:    ['CLOSING', 'CLOSED'],
  CLOSING: ['CLOSED'],
  CLOSED:  ['LOCKED'],
  LOCKED:  [],              // terminal
} as const;

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export class AccountingPeriod {
  private readonly _period:   string;
  private readonly _tenantId: string;
  private _status:            AccountingPeriodStatus;
  private readonly _openedAt: Date;
  private _closedAt:          Date | null;
  private _lockedAt:          Date | null;

  private constructor(
    tenantId:  string,
    period:    string,
    status:    AccountingPeriodStatus,
    openedAt:  Date,
    closedAt:  Date | null,
    lockedAt:  Date | null,
  ) {
    this._tenantId = tenantId;
    this._period   = period;
    this._status   = status;
    this._openedAt = openedAt;
    this._closedAt = closedAt;
    this._lockedAt = lockedAt;
  }

  // ── Factory ────────────────────────────────────────────────────────────────

  static open(tenantId: string, period: string): AccountingPeriod {
    AccountingPeriod.assertValidPeriod(period);
    return new AccountingPeriod(tenantId, period, 'OPEN', new Date(), null, null);
  }

  static reconstitute(
    tenantId:  string,
    period:    string,
    status:    AccountingPeriodStatus,
    openedAt:  Date,
    closedAt:  Date | null,
    lockedAt:  Date | null,
  ): AccountingPeriod {
    AccountingPeriod.assertValidPeriod(period);
    return new AccountingPeriod(tenantId, period, status, openedAt, closedAt, lockedAt);
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  get tenantId():  string                 { return this._tenantId; }
  get period():    string                 { return this._period; }
  get status():    AccountingPeriodStatus { return this._status; }
  get openedAt():  Date                   { return this._openedAt; }
  get closedAt():  Date | null            { return this._closedAt; }
  get lockedAt():  Date | null            { return this._lockedAt; }
  get isOpen():    boolean                { return this._status === 'OPEN'; }
  get isClosed():  boolean                { return this._status === 'CLOSED' || this._status === 'LOCKED'; }
  get isLocked():  boolean                { return this._status === 'LOCKED'; }

  /** Returns the YYYY and MM parts. */
  get year():  number { return parseInt(this._period.slice(0, 4), 10); }
  get month(): number { return parseInt(this._period.slice(5, 7), 10); }

  /**
   * Asserts that a ledger entry posting date falls within this period.
   * Throws if the period is not OPEN or the date is outside the calendar month.
   */
  assertAcceptsPosting(postedAt: Date): void {
    if (!this.isOpen) {
      throw new Error(
        `Accounting period ${this._period} is ${this._status} — postings not accepted.`,
      );
    }
    const periodYear  = this.year;
    const periodMonth = this.month;
    const y = postedAt.getUTCFullYear();
    const m = postedAt.getUTCMonth() + 1;   // 1-based
    if (y !== periodYear || m !== periodMonth) {
      throw new Error(
        `Posting date ${postedAt.toISOString().slice(0, 10)} falls outside period ${this._period}.`,
      );
    }
  }

  // ── Commands ───────────────────────────────────────────────────────────────

  beginClosing(): void {
    this.assertTransition('CLOSING');
    this._status = 'CLOSING';
  }

  close(closedAt: Date = new Date()): void {
    this.assertTransition('CLOSED');
    this._status   = 'CLOSED';
    this._closedAt = closedAt;
  }

  lock(lockedAt: Date = new Date()): void {
    this.assertTransition('LOCKED');
    this._status   = 'LOCKED';
    this._lockedAt = lockedAt;
  }

  // ── Comparison ────────────────────────────────────────────────────────────

  /** Returns the canonical YYYY-MM string for the period following this one. */
  nextPeriodKey(): string {
    const y = this.year;
    const m = this.month;
    if (m === 12) return `${y + 1}-01`;
    return `${y}-${String(m + 1).padStart(2, '0')}`;
  }

  isBefore(other: AccountingPeriod): boolean {
    return this._period < other._period;
  }

  isAfter(other: AccountingPeriod): boolean {
    return this._period > other._period;
  }

  // ── Serialization ─────────────────────────────────────────────────────────

  toJSON() {
    return {
      tenantId: this._tenantId,
      period:   this._period,
      status:   this._status,
      openedAt: this._openedAt.toISOString(),
      closedAt: this._closedAt?.toISOString() ?? null,
      lockedAt: this._lockedAt?.toISOString() ?? null,
    };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private assertTransition(to: AccountingPeriodStatus): void {
    const allowed = ACCOUNTING_PERIOD_TRANSITIONS[this._status];
    if (!(allowed as readonly string[]).includes(to)) {
      throw new Error(
        `Illegal AccountingPeriod transition: ${this._status} → ${to} for period ${this._period}.`,
      );
    }
  }

  private static assertValidPeriod(period: string): void {
    if (!PERIOD_PATTERN.test(period)) {
      throw new Error(
        `Invalid accounting period format "${period}". Expected YYYY-MM (e.g. "2026-07").`,
      );
    }
  }
}
