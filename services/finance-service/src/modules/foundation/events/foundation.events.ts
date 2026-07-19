/**
 * foundation.events.ts
 *
 * Finance Foundation domain events.
 *
 * Emitted by Finance domain aggregates and services — not by Commercial.
 * No transport dependency: these are plain enums and interfaces.
 * Transport (EventEmitter2, message broker, etc.) is the responsibility
 * of the application layer, not the domain.
 *
 * Naming: spancle.finance.<aggregate>.<past_verb>
 */

// ── Event type constants ──────────────────────────────────────────────────────

export const FinanceFoundationEvents = {

  // AccountingPeriod
  PERIOD_OPENED:          'spancle.finance.accounting_period.opened',
  PERIOD_CLOSING_STARTED: 'spancle.finance.accounting_period.closing_started',
  PERIOD_CLOSED:          'spancle.finance.accounting_period.closed',
  PERIOD_LOCKED:          'spancle.finance.accounting_period.locked',

  // FinancialTransaction
  TRANSACTION_CREATED:    'spancle.finance.transaction.created',
  TRANSACTION_COMMITTED:  'spancle.finance.transaction.committed',
  TRANSACTION_FAILED:     'spancle.finance.transaction.failed',
  TRANSACTION_REVERSED:   'spancle.finance.transaction.reversed',

  // LedgerEntry
  ENTRY_PENDING:          'spancle.finance.ledger_entry.pending',
  ENTRY_POSTED:           'spancle.finance.ledger_entry.posted',
  ENTRY_FAILED:           'spancle.finance.ledger_entry.failed',
  ENTRY_REVERSED:         'spancle.finance.ledger_entry.reversed',

} as const;

export type FinanceFoundationEventType =
  typeof FinanceFoundationEvents[keyof typeof FinanceFoundationEvents];

// ── Payload interfaces ────────────────────────────────────────────────────────

export interface PeriodOpenedPayload {
  tenantId:  string;
  period:    string;         // YYYY-MM
  openedAt:  string;         // ISO-8601
  timestamp: string;
}

export interface PeriodClosedPayload {
  tenantId:  string;
  period:    string;
  closedAt:  string;
  timestamp: string;
}

export interface PeriodLockedPayload {
  tenantId:  string;
  period:    string;
  lockedAt:  string;
  timestamp: string;
}

export interface TransactionCreatedPayload {
  tenantId:         string;
  transactionId:    string;
  reference:        string;
  transactionType:  string;
  accountingPeriod: string;
  sourceType:       string | null;
  sourceId:         string | null;
  entryCount:       number;
  timestamp:        string;
}

export interface TransactionCommittedPayload {
  tenantId:         string;
  transactionId:    string;
  reference:        string;
  transactionType:  string;
  accountingPeriod: string;
  sourceType:       string | null;
  sourceId:         string | null;
  /** Total debits in minor units per currency, e.g. { GBP: 5000 } */
  totalsByCurrency: Record<string, number>;
  committedAt:      string;
  timestamp:        string;
}

export interface TransactionFailedPayload {
  tenantId:      string;
  transactionId: string;
  reference:     string;
  reason:        string;
  timestamp:     string;
}

export interface TransactionReversedPayload {
  tenantId:             string;
  transactionId:        string;
  reference:            string;
  reversedByTransactionId: string;
  timestamp:            string;
}

export interface LedgerEntryPostedPayload {
  tenantId:         string;
  entryId:          string;
  transactionId:    string;
  accountCode:      string;
  accountingPeriod: string;
  debitOrCredit:    'DEBIT' | 'CREDIT';
  amountMinor:      number;
  currency:         string;
  postedAt:         string;
  timestamp:        string;
}

export interface LedgerEntryReversedPayload {
  tenantId:       string;
  entryId:        string;
  transactionId:  string;
  reversedById:   string;
  timestamp:      string;
}
