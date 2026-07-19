/**
 * chart-of-accounts.ts
 *
 * AccountingRole — canonical logical roles in the Finance domain.
 * AccountDefinition — immutable account definition in the chart.
 * ChartOfAccounts — static in-memory registry of platform account definitions.
 *
 * Roles are the stable Finance abstraction. Account codes are mapped to roles.
 * Tenant overrides can remap roles to different codes in future phases.
 *
 * Design rules:
 *   - Immutable. No database access.
 *   - Roles are posting-rule-facing labels; codes are ledger-facing identifiers.
 *   - One role maps to exactly one account code per currency context.
 *   - Inactive accounts cannot receive postings.
 */

// ── AccountingRole ────────────────────────────────────────────────────────────

export type AccountingRole =
  | 'CASH'                   // physical or bank cash (asset)
  | 'BANK'                   // bank account (asset)
  | 'ACCOUNTS_RECEIVABLE'    // amounts owed to the platform (asset)
  | 'ACCOUNTS_PAYABLE'       // amounts owed by the platform (liability)
  | 'SERVICE_REVENUE'        // general service revenue (income)
  | 'PLATFORM_REVENUE'       // platform-specific revenue share (income)
  | 'TENANT_REVENUE'         // tenant-specific revenue (income)
  | 'DISCOUNT'               // discount contra-income (contra-income)
  | 'TAX_PAYABLE'            // tax collected on behalf of authority (liability)
  | 'REFUND'                 // refund expense (expense)
  | 'SETTLEMENT'             // fund settlement liability (liability)
  | 'REVENUE_SHARE_PAYABLE'; // revenue share owed to tenant (liability)

// ── AccountType ───────────────────────────────────────────────────────────────

export type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'INCOME'
  | 'CONTRA_INCOME'
  | 'EXPENSE';

// ── AccountDefinition ─────────────────────────────────────────────────────────

/**
 * Immutable definition of a single account in the chart of accounts.
 * `currencyRestriction`: when set, only postings in that ISO-4217 code are accepted.
 */
export interface AccountDefinition {
  readonly accountCode:          string;
  readonly accountName:          string;
  readonly accountingRole:       AccountingRole;
  readonly accountType:          AccountType;
  readonly normalBalance:        'DEBIT' | 'CREDIT';
  /** ISO-4217 code. null = accepts any currency. */
  readonly currencyRestriction:  string | null;
  readonly active:               boolean;
  readonly description:          string;
}

// ── Platform default chart of accounts ───────────────────────────────────────

/**
 * Immutable, in-memory platform chart of accounts (v1.0).
 *
 * Code ranges:
 *   1000–1999 Assets
 *   2000–2999 Liabilities
 *   3000–3999 Income / Revenue
 *   4000–4999 Tenant Revenue
 *   5000–5999 Contra-Income (Discounts)
 *   6000–6999 Settlement Liabilities
 *   7000–7999 Revenue Share Liabilities
 *   8000–8999 Tax Liabilities
 *   9000–9999 Expenses (Refunds)
 */
const PLATFORM_CHART: ReadonlyArray<AccountDefinition> = [
  // ── Assets ────────────────────────────────────────────────────────────────
  {
    accountCode: '1000', accountName: 'Cash and Cash Equivalents',
    accountingRole: 'CASH', accountType: 'ASSET', normalBalance: 'DEBIT',
    currencyRestriction: null, active: true,
    description: 'Cash held by the platform',
  },
  {
    accountCode: '1010', accountName: 'Bank – GBP',
    accountingRole: 'BANK', accountType: 'ASSET', normalBalance: 'DEBIT',
    currencyRestriction: 'GBP', active: true,
    description: 'Platform GBP bank account',
  },
  {
    accountCode: '1100', accountName: 'Accounts Receivable',
    accountingRole: 'ACCOUNTS_RECEIVABLE', accountType: 'ASSET', normalBalance: 'DEBIT',
    currencyRestriction: null, active: true,
    description: 'Amounts owed to the platform by tenants',
  },

  // ── Liabilities ───────────────────────────────────────────────────────────
  {
    accountCode: '2000', accountName: 'Accounts Payable',
    accountingRole: 'ACCOUNTS_PAYABLE', accountType: 'LIABILITY', normalBalance: 'CREDIT',
    currencyRestriction: null, active: true,
    description: 'Amounts owed by the platform to tenants',
  },

  // ── Income ────────────────────────────────────────────────────────────────
  {
    accountCode: '3000', accountName: 'Platform Service Revenue',
    accountingRole: 'PLATFORM_REVENUE', accountType: 'INCOME', normalBalance: 'CREDIT',
    currencyRestriction: null, active: true,
    description: 'Platform share of subscription and transaction revenue',
  },
  {
    accountCode: '3100', accountName: 'General Service Revenue',
    accountingRole: 'SERVICE_REVENUE', accountType: 'INCOME', normalBalance: 'CREDIT',
    currencyRestriction: null, active: true,
    description: 'General service revenue before split',
  },

  // ── Tenant revenue ────────────────────────────────────────────────────────
  {
    accountCode: '4000', accountName: 'Tenant Revenue',
    accountingRole: 'TENANT_REVENUE', accountType: 'INCOME', normalBalance: 'CREDIT',
    currencyRestriction: null, active: true,
    description: 'Revenue attributable to the tenant',
  },

  // ── Contra-income ─────────────────────────────────────────────────────────
  {
    accountCode: '5000', accountName: 'Discounts Given',
    accountingRole: 'DISCOUNT', accountType: 'CONTRA_INCOME', normalBalance: 'DEBIT',
    currencyRestriction: null, active: true,
    description: 'Discounts and promotional reductions',
  },

  // ── Settlement liabilities ────────────────────────────────────────────────
  {
    accountCode: '6000', accountName: 'Settlement Liability',
    accountingRole: 'SETTLEMENT', accountType: 'LIABILITY', normalBalance: 'CREDIT',
    currencyRestriction: null, active: true,
    description: 'Funds collected pending settlement',
  },

  // ── Revenue share payable ─────────────────────────────────────────────────
  {
    accountCode: '7000', accountName: 'Revenue Share Payable',
    accountingRole: 'REVENUE_SHARE_PAYABLE', accountType: 'LIABILITY', normalBalance: 'CREDIT',
    currencyRestriction: null, active: true,
    description: 'Tenant revenue share owed after distribution calculation',
  },

  // ── Tax liabilities ───────────────────────────────────────────────────────
  {
    accountCode: '8000', accountName: 'Tax Payable',
    accountingRole: 'TAX_PAYABLE', accountType: 'LIABILITY', normalBalance: 'CREDIT',
    currencyRestriction: null, active: true,
    description: 'Tax collected to be remitted to tax authority',
  },

  // ── Expenses ──────────────────────────────────────────────────────────────
  {
    accountCode: '9000', accountName: 'Refund Expense',
    accountingRole: 'REFUND', accountType: 'EXPENSE', normalBalance: 'DEBIT',
    currencyRestriction: null, active: true,
    description: 'Cost of refunds issued to customers',
  },
];

// Freeze everything
const FROZEN_CHART: ReadonlyArray<Readonly<AccountDefinition>> =
  Object.freeze(PLATFORM_CHART.map((a) => Object.freeze(a)));

// Role → AccountDefinition index (platform default)
const ROLE_INDEX = new Map<AccountingRole, Readonly<AccountDefinition>>(
  FROZEN_CHART.map((a) => [a.accountingRole, a]),
);

// Code → AccountDefinition index
const CODE_INDEX = new Map<string, Readonly<AccountDefinition>>(
  FROZEN_CHART.map((a) => [a.accountCode, a]),
);

// ── ChartOfAccounts ───────────────────────────────────────────────────────────

/**
 * Static, immutable platform chart of accounts.
 *
 * Tenant overrides (future): a tenant-specific overlay replaces
 * or extends the platform chart. This is deferred to a future phase.
 * For now, all tenants share the platform chart.
 */
export const ChartOfAccounts = Object.freeze({

  /** Returns all active account definitions. */
  all(): ReadonlyArray<Readonly<AccountDefinition>> {
    return FROZEN_CHART;
  },

  /** Finds an account definition by its 4-digit code. Returns null if not found. */
  findByCode(code: string): Readonly<AccountDefinition> | null {
    return CODE_INDEX.get(code) ?? null;
  },

  /** Finds the platform-default account for a given role. Returns null if not found. */
  findByRole(role: AccountingRole): Readonly<AccountDefinition> | null {
    return ROLE_INDEX.get(role) ?? null;
  },

  /** Returns true when the code exists and is active. */
  isActiveCode(code: string): boolean {
    const a = CODE_INDEX.get(code);
    return a?.active === true;
  },

  /** Returns true when the role exists in the platform chart. */
  hasRole(role: string): boolean {
    return ROLE_INDEX.has(role as AccountingRole);
  },
});
