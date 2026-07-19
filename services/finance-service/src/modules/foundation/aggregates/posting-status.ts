/**
 * posting-status.ts
 *
 * PostingStatus — lifecycle of a financial ledger posting.
 *
 * Transitions:
 *
 *   PENDING  → POSTED      (posting completed; entry is immutable)
 *   PENDING  → FAILED      (posting rejected by period guard or validation)
 *   POSTED   → REVERSED    (corrected by a new reversing entry; original locked)
 *
 * REVERSED entries are never deleted; the reversal creates a new POSTED entry.
 * FAILED entries are never retried in place; a new transaction is created.
 *
 * Immutability rule:
 *   A ledger entry in POSTED or REVERSED status must never be updated.
 *   The only legal mutation of a POSTED entry is setting status → REVERSED
 *   and recording the reversedById.
 */

export type PostingStatus = 'PENDING' | 'POSTED' | 'REVERSED' | 'FAILED';

export const PostingStatusValues: readonly PostingStatus[] = [
  'PENDING', 'POSTED', 'REVERSED', 'FAILED',
] as const;

/** Legal status transitions for ledger entries. */
export const POSTING_STATUS_TRANSITIONS: Record<PostingStatus, readonly PostingStatus[]> = {
  PENDING:  ['POSTED', 'FAILED'],
  POSTED:   ['REVERSED'],
  REVERSED: [],            // terminal — no further transitions
  FAILED:   [],            // terminal — no further transitions
} as const;

/**
 * Returns true when the transition from `from` → `to` is legal.
 */
export function isLegalPostingTransition(
  from: PostingStatus,
  to:   PostingStatus,
): boolean {
  return (POSTING_STATUS_TRANSITIONS[from] as readonly string[]).includes(to);
}

/**
 * Asserts that a transition is legal; throws if not.
 */
export function assertLegalPostingTransition(
  from: PostingStatus,
  to:   PostingStatus,
): void {
  if (!isLegalPostingTransition(from, to)) {
    throw new Error(
      `Illegal PostingStatus transition: ${from} → ${to}. ` +
      `Allowed from ${from}: [${POSTING_STATUS_TRANSITIONS[from].join(', ') || 'none'}]`,
    );
  }
}

/**
 * Returns true when the status is terminal (no further transitions allowed).
 */
export function isTerminalPostingStatus(status: PostingStatus): boolean {
  return POSTING_STATUS_TRANSITIONS[status].length === 0;
}
