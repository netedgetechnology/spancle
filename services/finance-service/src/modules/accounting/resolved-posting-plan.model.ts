/**
 * resolved-posting-plan.model.ts
 *
 * AccountingResolutionContext — tenant-scoped context for period-aware resolution.
 * ResolvedPostingInstruction — an instruction with a fully resolved account.
 * ResolvedPostingPlan — the output of the Accounting Resolution Layer.
 *
 * All types are immutable. No ORM entities. No persistence.
 */
import type { AccountDefinition, AccountType } from './chart-of-accounts';
import type { DebitOrCredit } from '../foundation/aggregates/ledger-entry.aggregate';

// ── AccountingResolutionContext ───────────────────────────────────────────────

/**
 * Immutable context supplied to the AccountingResolutionLayer.
 *
 * Replaces ad-hoc period derivation in the Posting Rule Engine.
 * The application layer provides this context — it is not derived
 * from system clock inside the resolution logic.
 */
export interface AccountingResolutionContext {
  readonly tenantId:         string;
  readonly accountingPeriod: string;    // YYYY-MM
  readonly baseCurrency:     string;    // ISO-4217
  readonly fiscalYear:       number;
  readonly fiscalMonth:      number;    // 1–12
}

/**
 * Parses a YYYY-MM string into an AccountingResolutionContext.
 * baseCurrency defaults to 'GBP' when not specified.
 */
export function buildResolutionContext(
  tenantId:         string,
  accountingPeriod: string,
  baseCurrency      = 'GBP',
): AccountingResolutionContext {
  const [yearStr, monthStr] = accountingPeriod.split('-');
  const fiscalYear  = parseInt(yearStr  ?? '0', 10);
  const fiscalMonth = parseInt(monthStr ?? '0', 10);

  if (!tenantId)                   throw new Error('AccountingResolutionContext: tenantId is required');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(accountingPeriod))
    throw new Error(`AccountingResolutionContext: invalid accountingPeriod "${accountingPeriod}"`);
  if (!baseCurrency || baseCurrency.length !== 3)
    throw new Error(`AccountingResolutionContext: baseCurrency must be 3-char ISO-4217; got "${baseCurrency}"`);

  return Object.freeze({ tenantId, accountingPeriod, baseCurrency, fiscalYear, fiscalMonth });
}

// ── ResolvedPostingInstruction ────────────────────────────────────────────────

/**
 * A PostingInstruction with fully resolved account metadata.
 *
 * Extends the original instruction with accountName and accountType
 * so the Ledger Posting Engine can write entries without another lookup.
 */
export interface ResolvedPostingInstruction {
  readonly accountCode:  string;
  readonly accountName:  string;
  readonly accountType:  AccountType;
  readonly side:         DebitOrCredit;
  readonly amountMinor:  number;
  readonly currency:     string;
  readonly description:  string;
}

// ── ResolvedPostingPlan ───────────────────────────────────────────────────────

/**
 * Fully resolved posting plan produced by the Accounting Resolution Layer.
 *
 * The Ledger Posting Engine consumes only ResolvedPostingPlans — it never
 * reads abstract account codes from a PostingPlan directly.
 */
export interface ResolvedPostingPlan {
  readonly planId:           string;
  readonly tenantId:         string;
  readonly accountingPeriod: string;
  readonly fiscalYear:       number;
  readonly fiscalMonth:      number;
  readonly currency:         string;
  readonly sourceReference:  string;
  readonly description:      string;
  readonly instructions:     ReadonlyArray<ResolvedPostingInstruction>;
  readonly totalDebitMinor:  number;
  readonly totalCreditMinor: number;
  readonly isBalanced:       boolean;
  readonly resolvedAt:       string;   // ISO-8601
}

// ── Resolution validation errors ──────────────────────────────────────────────

export type ResolutionErrorCode =
  | 'UNKNOWN_ACCOUNT_CODE'        // account code not found in chart
  | 'INACTIVE_ACCOUNT'            // account exists but is inactive
  | 'CURRENCY_RESTRICTION'        // posting currency violates account restriction
  | 'DUPLICATE_ACCOUNT_MAPPING'   // same code appears on both sides of an instruction
  | 'MISSING_TENANT_CHART'        // tenant has no chart override when one is required
  | 'UNRESOLVED_INSTRUCTION'      // instruction could not be resolved
  | 'UNBALANCED_AFTER_RESOLUTION'; // balance broken after resolution (internal guard)

export interface ResolutionValidationError {
  readonly code:    ResolutionErrorCode;
  readonly field:   string;
  readonly message: string;
}

export type AccountingResolutionResult =
  | { resolved: true;  plan:   Readonly<ResolvedPostingPlan> }
  | { resolved: false; errors: ReadonlyArray<ResolutionValidationError> };
