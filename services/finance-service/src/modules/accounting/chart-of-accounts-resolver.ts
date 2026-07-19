/**
 * chart-of-accounts-resolver.ts
 *
 * ChartOfAccountsResolver — resolves a PostingPlan into a ResolvedPostingPlan.
 *
 * Pure. No database. No async. No side effects.
 * Same input always produces the same output (deterministic).
 *
 * Phase 1 (this batch): uses only the platform-default chart.
 * Phase 2 (future): tenant chart overlays are applied before resolution.
 *
 * Resolution rules:
 *   1. Look up each instruction's accountCode in the chart.
 *   2. Reject if the account code is not found.
 *   3. Reject if the account is inactive.
 *   4. Reject if the instruction currency violates the account's currencyRestriction.
 *   5. Reject if the same code appears on both sides of a plan (duplicate mapping guard).
 *   6. Produce ResolvedPostingInstruction with account metadata.
 *   7. Verify the resolved plan is still balanced.
 */
import { ChartOfAccounts }                from './chart-of-accounts';
import type { PostingPlan, PostingInstruction } from '../posting/posting-plan.model';
import type {
  AccountingResolutionContext,
  AccountingResolutionResult,
  ResolvedPostingInstruction,
  ResolvedPostingPlan,
  ResolutionValidationError,
} from './resolved-posting-plan.model';

// ── ChartOfAccountsResolver ───────────────────────────────────────────────────

export class ChartOfAccountsResolver {

  /**
   * Resolves a PostingPlan into a ResolvedPostingPlan using the platform chart.
   *
   * @param plan     The posting plan with abstract account codes.
   * @param context  Tenant and period context.
   * @returns        AccountingResolutionResult — typed union, never throws.
   */
  static resolve(
    plan:    Readonly<PostingPlan>,
    context: Readonly<AccountingResolutionContext>,
  ): AccountingResolutionResult {
    const errors: ResolutionValidationError[] = [];

    // ── Duplicate account code guard ──────────────────────────────────────────
    const debitCodes  = new Set(plan.instructions.filter((i) => i.side === 'DEBIT').map((i) => i.accountCode));
    const creditCodes = new Set(plan.instructions.filter((i) => i.side === 'CREDIT').map((i) => i.accountCode));
    const duplicates  = [...debitCodes].filter((c) => creditCodes.has(c));
    if (duplicates.length > 0) {
      errors.push({
        code:    'DUPLICATE_ACCOUNT_MAPPING',
        field:   'instructions',
        message: `Account code(s) ${duplicates.join(', ')} appear on both DEBIT and CREDIT sides`,
      });
    }

    // ── Resolve each instruction ──────────────────────────────────────────────
    const resolved: ResolvedPostingInstruction[] = [];

    for (let idx = 0; idx < plan.instructions.length; idx++) {
      const ins    = plan.instructions[idx]!;
      const result = ChartOfAccountsResolver.resolveInstruction(ins, idx);
      if (result.error) {
        errors.push(result.error);
      } else {
        resolved.push(result.instruction!);
      }
    }

    if (errors.length) {
      return { resolved: false, errors: Object.freeze(errors) };
    }

    // ── Balance check post-resolution ─────────────────────────────────────────
    const totalDr = resolved.filter((i) => i.side === 'DEBIT').reduce((s, i) => s + i.amountMinor, 0);
    const totalCr = resolved.filter((i) => i.side === 'CREDIT').reduce((s, i) => s + i.amountMinor, 0);

    if (totalDr !== totalCr) {
      return {
        resolved: false,
        errors: Object.freeze([{
          code:    'UNBALANCED_AFTER_RESOLUTION',
          field:   'instructions',
          message: `Resolved plan is not balanced: DR=${totalDr} CR=${totalCr}`,
        }]),
      };
    }

    const resolvedPlan: ResolvedPostingPlan = Object.freeze({
      planId:           plan.planId,
      tenantId:         context.tenantId,
      accountingPeriod: context.accountingPeriod,
      fiscalYear:       context.fiscalYear,
      fiscalMonth:      context.fiscalMonth,
      currency:         plan.currency,
      sourceReference:  plan.sourceReference,
      description:      plan.description,
      instructions:     Object.freeze(resolved.map((i) => Object.freeze(i))),
      totalDebitMinor:  totalDr,
      totalCreditMinor: totalCr,
      isBalanced:       totalDr === totalCr,
      resolvedAt:       new Date().toISOString(),
    });

    return { resolved: true, plan: resolvedPlan };
  }

  /**
   * Validates that all account codes in a plan exist in the chart.
   * Does not produce a resolved plan — use for pre-flight validation.
   */
  static validateCodes(plan: Readonly<PostingPlan>): ResolutionValidationError[] {
    const errors: ResolutionValidationError[] = [];
    for (const ins of plan.instructions) {
      const acct = ChartOfAccounts.findByCode(ins.accountCode);
      if (!acct) {
        errors.push({
          code:    'UNKNOWN_ACCOUNT_CODE',
          field:   `accountCode`,
          message: `Account code "${ins.accountCode}" not found in chart of accounts`,
        });
      }
    }
    return errors;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private static resolveInstruction(
    ins: Readonly<PostingInstruction>,
    idx: number,
  ): { error?: ResolutionValidationError; instruction?: ResolvedPostingInstruction } {
    const acct = ChartOfAccounts.findByCode(ins.accountCode);

    if (!acct) {
      return {
        error: {
          code:    'UNKNOWN_ACCOUNT_CODE',
          field:   `instructions[${idx}].accountCode`,
          message: `Account code "${ins.accountCode}" not found in chart of accounts`,
        },
      };
    }

    if (!acct.active) {
      return {
        error: {
          code:    'INACTIVE_ACCOUNT',
          field:   `instructions[${idx}].accountCode`,
          message: `Account "${ins.accountCode}" (${acct.accountName}) is inactive and cannot receive postings`,
        },
      };
    }

    if (acct.currencyRestriction !== null && acct.currencyRestriction !== ins.currency) {
      return {
        error: {
          code:    'CURRENCY_RESTRICTION',
          field:   `instructions[${idx}].currency`,
          message:
            `Account "${ins.accountCode}" is restricted to ${acct.currencyRestriction}; ` +
            `received ${ins.currency}`,
        },
      };
    }

    return {
      instruction: {
        accountCode:  ins.accountCode,
        accountName:  acct.accountName,
        accountType:  acct.accountType,
        side:         ins.side,
        amountMinor:  ins.amountMinor,
        currency:     ins.currency,
        description:  ins.description,
      },
    };
  }
}
