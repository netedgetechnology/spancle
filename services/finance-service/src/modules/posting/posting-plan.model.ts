/**
 * posting-plan.model.ts
 *
 * Immutable Posting Plan — the output of the Posting Rule Engine.
 *
 * A PostingPlan contains INTENT only. It describes what should be posted
 * but does not perform posting. The Ledger Posting Engine (future phase)
 * reads a PostingPlan and creates LedgerEntry aggregates.
 *
 * Immutability contract:
 *   All fields are readonly. The plan is Object.freeze()d at creation.
 *   Instructions array is frozen. No mutation after construction.
 *
 * Accounting conventions used by the default policies:
 *
 *   Account codes (simplified 4-digit chart of accounts):
 *     1000  — Cash / Receivables (asset)
 *     2000  — Accounts Payable (liability)
 *     3000  — Platform Revenue (income)
 *     4000  — Tenant Revenue (income)
 *     5000  — Discounts Given (contra-income)
 *     6000  — Settlement Liability (liability)
 *     7000  — Revenue Share Payable (liability)
 *
 * These are the Finance domain's own codes — no Commercial references.
 */

import type { DebitOrCredit } from '../foundation/aggregates/ledger-entry.aggregate';

// ── PostingInstruction ────────────────────────────────────────────────────────

/**
 * A single debit or credit instruction within a PostingPlan.
 *
 * Immutable. Does NOT reference LedgerEntry — it is pure intent.
 * One PostingInstruction will produce one LedgerEntry when the plan
 * is executed by the Ledger Posting Engine.
 */
export interface PostingInstruction {
  readonly accountCode:  string;
  readonly side:         DebitOrCredit;
  /** Amount in minor currency units (INT). Must be > 0. */
  readonly amountMinor:  number;
  readonly currency:     string;
  readonly description:  string;
}

// ── PostingType ───────────────────────────────────────────────────────────────

export type PostingType =
  | 'PAYMENT_RECEIPT'           // incoming payment
  | 'INVOICE_REVENUE'           // revenue recognition from invoice
  | 'SETTLEMENT'                // fund settlement to tenant/platform
  | 'REVENUE_DISTRIBUTION'      // split of revenue between parties
  | 'REFUND'                    // refund posting
  | 'ADJUSTMENT';               // manual adjustment

// ── PostingPlan ───────────────────────────────────────────────────────────────

/**
 * Immutable Posting Plan produced by the Posting Rule Engine.
 *
 * Contains only posting intent — no persistence identifiers.
 * The Ledger Posting Engine (future) assigns transaction/entry IDs.
 */
export interface PostingPlan {
  readonly planId:           string;       // client-assigned idempotency key
  readonly tenantId:         string;
  readonly postingType:      PostingType;
  readonly accountingPeriod: string;       // YYYY-MM
  readonly currency:         string;
  readonly sourceReference:  string;       // links back to Finance command
  readonly description:      string;
  readonly instructions:     ReadonlyArray<PostingInstruction>;
  readonly totalDebitMinor:  number;
  readonly totalCreditMinor: number;
  /** Whether ∑ debitMinor === ∑ creditMinor. Enforced at plan creation. */
  readonly isBalanced:       boolean;
  readonly createdAt:        string;       // ISO-8601
}

// ── PostingPlan factory ───────────────────────────────────────────────────────

export function createPostingPlan(
  input: Omit<PostingPlan, 'totalDebitMinor' | 'totalCreditMinor' | 'isBalanced' | 'createdAt'>,
): Readonly<PostingPlan> {
  const totalDebitMinor  = input.instructions
    .filter((i) => i.side === 'DEBIT')
    .reduce((s, i) => s + i.amountMinor, 0);
  const totalCreditMinor = input.instructions
    .filter((i) => i.side === 'CREDIT')
    .reduce((s, i) => s + i.amountMinor, 0);

  const plan: PostingPlan = {
    ...input,
    instructions:     Object.freeze([...input.instructions.map((i) => Object.freeze({ ...i }))]),
    totalDebitMinor,
    totalCreditMinor,
    isBalanced:       totalDebitMinor === totalCreditMinor,
    createdAt:        new Date().toISOString(),
  };
  return Object.freeze(plan);
}
