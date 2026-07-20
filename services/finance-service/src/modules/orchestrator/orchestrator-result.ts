/**
 * orchestrator-result.ts
 *
 * Typed application result for the Financial Transaction Orchestrator.
 * Every pipeline outcome is a typed value — never throws to the caller.
 */

export type OrchestratorFailureReason =
  | 'VALIDATION_FAILED'      // Posting Rule Engine rejected the command
  | 'RESOLUTION_FAILED'      // Account resolution failed
  | 'POSTING_FAILED'         // Ledger Posting Engine persistence failed
  | 'PERIOD_CLOSED'          // Accounting period is not OPEN
  | 'INTERNAL_ERROR';        // Unexpected error in the orchestrator itself

export interface OrchestratorError {
  readonly field:   string;
  readonly message: string;
}

// ── Success ───────────────────────────────────────────────────────────────────

export interface TransactionCompleted {
  readonly success:       true;
  readonly transactionId: string;
  readonly entryIds:      ReadonlyArray<string>;
  readonly postedAt:      string;
  readonly eventIds:      ReadonlyArray<string>;
}

// ── Failure ───────────────────────────────────────────────────────────────────

export interface TransactionRejected {
  readonly success: false;
  readonly reason:  OrchestratorFailureReason;
  readonly errors:  ReadonlyArray<OrchestratorError>;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type OrchestratorResult = TransactionCompleted | TransactionRejected;

// ── Factories ─────────────────────────────────────────────────────────────────

export function transactionCompleted(
  transactionId: string,
  entryIds:      string[],
  postedAt:      string,
  eventIds:      string[],
): TransactionCompleted {
  return Object.freeze({
    success: true,
    transactionId,
    entryIds:  Object.freeze(entryIds),
    postedAt,
    eventIds:  Object.freeze(eventIds),
  });
}

export function transactionRejected(
  reason: OrchestratorFailureReason,
  errors: OrchestratorError[],
): TransactionRejected {
  return Object.freeze({
    success: false,
    reason,
    errors: Object.freeze(errors),
  });
}

export function orchError(field: string, message: string): OrchestratorError {
  return Object.freeze({ field, message });
}
