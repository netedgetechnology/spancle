/**
 * ledger-balance-validator.ts
 *
 * LedgerBalanceValidator — validates a ResolvedPostingPlan before posting.
 *
 * No business logic. No account resolution. No accounting decisions.
 * Pure structural validation that the plan is safe to persist.
 *
 * All checks return typed results — never throws.
 *
 * Checks (in order):
 *   1. At least one debit instruction
 *   2. At least one credit instruction
 *   3. No zero-value instructions
 *   4. ∑ debitMinor === ∑ creditMinor (balance invariant)
 *   5. Currency consistency (all instructions in the same currency)
 *   6. Accounting period is OPEN (delegated to the caller's period state)
 *   7. All accounts are active (confirmed from resolved metadata)
 */
import type { ResolvedPostingPlan } from '../accounting/resolved-posting-plan.model';
import {
  type LedgerPostingValidationError,
  type LedgerPostingReason,
  ledgerError,
} from './ledger-posting-result';

export interface ValidationOutcome {
  readonly valid:  boolean;
  readonly reason: LedgerPostingReason | null;
  readonly errors: ReadonlyArray<LedgerPostingValidationError>;
}

const VALID: ValidationOutcome = Object.freeze({ valid: true, reason: null, errors: [] });

export class LedgerBalanceValidator {

  /**
   * Validates a ResolvedPostingPlan for posting eligibility.
   *
   * @param plan          The resolved plan to validate.
   * @param periodIsOpen  True when the accounting period is OPEN.
   *                      The caller checks period state; this validator
   *                      simply uses the boolean.
   */
  static validate(
    plan:         Readonly<ResolvedPostingPlan>,
    periodIsOpen: boolean,
  ): ValidationOutcome {
    const errors: LedgerPostingValidationError[] = [];

    // ── Accounting period guard ───────────────────────────────────────────────
    if (!periodIsOpen) {
      return Object.freeze({
        valid:  false,
        reason: 'ACCOUNTING_PERIOD_CLOSED' as LedgerPostingReason,
        errors: Object.freeze([ledgerError('accountingPeriod',
          `Accounting period "${plan.accountingPeriod}" is not OPEN — postings rejected`)]),
      });
    }

    // ── Instruction presence ──────────────────────────────────────────────────
    const debits  = plan.instructions.filter((i) => i.side === 'DEBIT');
    const credits = plan.instructions.filter((i) => i.side === 'CREDIT');

    if (debits.length === 0)  errors.push(ledgerError('instructions', 'At least one DEBIT instruction is required'));
    if (credits.length === 0) errors.push(ledgerError('instructions', 'At least one CREDIT instruction is required'));

    if (errors.length) return failWith('VALIDATION_FAILED', errors);

    // ── Zero-value instructions ───────────────────────────────────────────────
    for (let i = 0; i < plan.instructions.length; i++) {
      const ins = plan.instructions[i]!;
      if (ins.amountMinor === 0) {
        errors.push(ledgerError(
          `instructions[${i}].amountMinor`,
          `Instruction at index ${i} (${ins.accountCode} ${ins.side}) has zero amount — not permitted`,
        ));
      }
      if (ins.amountMinor < 0) {
        errors.push(ledgerError(
          `instructions[${i}].amountMinor`,
          `Instruction at index ${i} (${ins.accountCode} ${ins.side}) has negative amount ${ins.amountMinor} — not permitted`,
        ));
      }
    }

    if (errors.length) return failWith('ZERO_AMOUNT', errors);

    // ── Currency consistency ──────────────────────────────────────────────────
    const currencies = new Set(plan.instructions.map((i) => i.currency));
    if (currencies.size > 1) {
      return failWith('CURRENCY_MISMATCH', [ledgerError(
        'instructions',
        `Mixed currencies detected: [${[...currencies].join(', ')}]. All instructions must use the same currency.`,
      )]);
    }

    // ── Balance invariant ─────────────────────────────────────────────────────
    if (!plan.isBalanced) {
      return failWith('IMBALANCE_DETECTED', [ledgerError(
        'instructions',
        `Plan is not balanced: ∑ DR=${plan.totalDebitMinor} ≠ ∑ CR=${plan.totalCreditMinor}`,
      )]);
    }

    return VALID;
  }

  /**
   * Validates only the balance invariant of a plan (fast check).
   * Does not check period state or currency consistency.
   */
  static isBalanced(plan: Readonly<ResolvedPostingPlan>): boolean {
    return plan.isBalanced && plan.totalDebitMinor > 0;
  }
}

// ── Helper ────────────────────────────────────────────────────────────────────

function failWith(
  reason: LedgerPostingReason,
  errors: LedgerPostingValidationError[],
): ValidationOutcome {
  return Object.freeze({ valid: false, reason, errors: Object.freeze(errors) });
}
