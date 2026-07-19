/**
 * posting-result.model.ts
 *
 * Typed result for the Posting Rule Engine.
 *
 * All outcomes are represented as values — no exceptions thrown.
 * Consumer pattern:
 *
 *   const result = engine.resolve(command);
 *   if (result.success) {
 *     const plan = result.plan;  // PostingPlan
 *   } else {
 *     const reason = result.reason;  // PostingRejectionReason
 *   }
 */
import type { PostingPlan } from './posting-plan.model';

// ── Rejection reasons ─────────────────────────────────────────────────────────

export type PostingRejectionReason =
  | 'UNSUPPORTED_COMMAND'       // no policy handles this command kind
  | 'VALIDATION_FAILURE'        // command fields failed policy validation
  | 'ZERO_AMOUNT'               // posting amount resolved to zero (no-op)
  | 'NEGATIVE_AMOUNT'           // illegal negative amount in instruction
  | 'CURRENCY_MISMATCH'         // instructions contain mixed currencies
  | 'UNBALANCED_PLAN'           // ∑ debits ≠ ∑ credits (internal guard)
  | 'INTERNAL_ERROR';           // unexpected error in the engine

// ── Validation error ──────────────────────────────────────────────────────────

export interface PostingValidationError {
  readonly field:   string;
  readonly message: string;
}

// ── PostingPlanCreated (success) ──────────────────────────────────────────────

export interface PostingPlanCreated {
  readonly success: true;
  readonly plan:    Readonly<PostingPlan>;
}

// ── PostingRejected (failure) ─────────────────────────────────────────────────

export interface PostingRejected {
  readonly success: false;
  readonly reason:  PostingRejectionReason;
  readonly errors:  ReadonlyArray<PostingValidationError>;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type PostingResult = PostingPlanCreated | PostingRejected;

// ── Factories ─────────────────────────────────────────────────────────────────

export function postingPlanCreated(plan: Readonly<PostingPlan>): PostingPlanCreated {
  return Object.freeze({ success: true, plan });
}

export function postingRejected(
  reason: PostingRejectionReason,
  errors: PostingValidationError[],
): PostingRejected {
  return Object.freeze({ success: false, reason, errors: Object.freeze(errors) });
}

export function postingError(field: string, message: string): PostingValidationError {
  return Object.freeze({ field, message });
}
