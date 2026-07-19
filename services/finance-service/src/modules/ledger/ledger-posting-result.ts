/**
 * ledger-posting-result.ts
 *
 * Typed result for the Ledger Posting Engine.
 * All outcomes are represented as values — never throws.
 *
 * Consumer pattern:
 *
 *   const result = await engine.post(resolvedPlan, context);
 *   if (result.success) {
 *     const txId = result.transactionId;
 *   } else {
 *     const reason = result.reason;
 *   }
 */
import type { LedgerEntry } from '../foundation/aggregates/ledger-entry.aggregate';

// ── LedgerPostingReason ───────────────────────────────────────────────────────

export type LedgerPostingReason =
  | 'VALIDATION_FAILED'         // pre-posting validation errors
  | 'IMBALANCE_DETECTED'        // ∑ DR ≠ ∑ CR
  | 'ACCOUNTING_PERIOD_CLOSED'  // target period is not OPEN
  | 'INACTIVE_ACCOUNT'          // one or more accounts are inactive
  | 'CURRENCY_MISMATCH'         // mixed currencies in a single plan
  | 'ZERO_AMOUNT'               // one or more instructions have amountMinor = 0
  | 'PERSISTENCE_FAILED'        // database write failed
  | 'INTERNAL_ERROR';           // unexpected error

// ── LedgerPostingValidationError ─────────────────────────────────────────────

export interface LedgerPostingValidationError {
  readonly field:   string;
  readonly message: string;
}

// ── PostingSucceeded ──────────────────────────────────────────────────────────

export interface PostingSucceeded {
  readonly success:       true;
  readonly transactionId: string;
  readonly entryIds:      ReadonlyArray<string>;
  readonly postedAt:      string;   // ISO-8601
}

// ── PostingFailed ─────────────────────────────────────────────────────────────

export interface PostingFailed {
  readonly success: false;
  readonly reason:  LedgerPostingReason;
  readonly errors:  ReadonlyArray<LedgerPostingValidationError>;
}

// ── LedgerPostingResult ───────────────────────────────────────────────────────

export type LedgerPostingResult = PostingSucceeded | PostingFailed;

// ── Factories ─────────────────────────────────────────────────────────────────

export function postingSucceeded(
  transactionId: string,
  entries:       LedgerEntry[],
): PostingSucceeded {
  return Object.freeze({
    success:       true,
    transactionId,
    entryIds:      Object.freeze(entries.map((e) => e.id)),
    postedAt:      new Date().toISOString(),
  });
}

export function postingFailed(
  reason: LedgerPostingReason,
  errors: LedgerPostingValidationError[],
): PostingFailed {
  return Object.freeze({
    success: false,
    reason,
    errors:  Object.freeze(errors),
  });
}

export function ledgerError(field: string, message: string): LedgerPostingValidationError {
  return Object.freeze({ field, message });
}
