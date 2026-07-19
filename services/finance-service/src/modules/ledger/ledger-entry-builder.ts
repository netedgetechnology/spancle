/**
 * ledger-entry-builder.ts
 *
 * LedgerEntryBuilder — builds immutable LedgerEntry aggregates from a
 * ResolvedPostingPlan.
 *
 * Rules:
 *   - Deterministic: same plan + transactionId + postedAt → same entries.
 *   - No random state, no UUID generation within builder (IDs are injected).
 *   - No database access. No repositories.
 *   - Each ResolvedPostingInstruction produces exactly one LedgerEntry.
 *   - All entries start in PENDING status (the aggregate default).
 *   - Entry IDs are derived deterministically from planId + instruction index.
 *
 * The caller (LedgerPostingEngine) supplies:
 *   - transactionId  — UUID of the FinancialTransaction being created
 *   - entryIdPrefix  — a stable string used to derive per-entry IDs
 *   - postedAt       — the posting effective date
 */
import { LedgerEntry } from '../foundation/aggregates/ledger-entry.aggregate';
import type { ResolvedPostingPlan } from '../accounting/resolved-posting-plan.model';

export class LedgerEntryBuilder {

  /**
   * Builds one LedgerEntry per instruction in the ResolvedPostingPlan.
   *
   * Entry ID format: {entryIdPrefix}-{zero-padded index}
   * Example: "plan-finance-pay-001-00", "plan-finance-pay-001-01"
   *
   * @param plan          Fully resolved plan from the Accounting Resolution Layer.
   * @param transactionId UUID of the FinancialTransactionEntity to link.
   * @param entryIdPrefix Stable prefix for deterministic entry IDs.
   * @param postedAt      Accounting effective date.
   * @returns             Array of LedgerEntry in PENDING status.
   */
  static build(
    plan:          Readonly<ResolvedPostingPlan>,
    transactionId: string,
    entryIdPrefix: string,
    postedAt:      Date,
  ): LedgerEntry[] {
    return plan.instructions.map((ins, idx) => {
      const paddedIdx = String(idx).padStart(2, '0');
      const entryId   = `${entryIdPrefix}-${paddedIdx}`;

      return LedgerEntry.create({
        id:               entryId,
        tenantId:         plan.tenantId,
        transactionId,
        accountCode:      ins.accountCode,
        accountingPeriod: plan.accountingPeriod,
        debitOrCredit:    ins.side,
        amountMinor:      ins.amountMinor,
        currency:         ins.currency,
        description:      ins.description,
        postedAt,
        reversalOfId:     null,
      });
    });
  }

  /**
   * Returns the entry ID prefix used for a given plan.
   * Deterministic: same planId always produces the same prefix.
   */
  static entryIdPrefix(planId: string): string {
    return `ent-${planId}`;
  }
}
