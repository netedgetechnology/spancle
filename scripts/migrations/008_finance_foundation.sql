-- =============================================================================
-- Migration 008 (booking-service DB) — Finance Engine Core Accounting Foundation
--
-- Creates all tables required by FinanceModule Batch 7.1A:
--   finance_accounting_periods   — AccountingPeriodEntity
--   finance_accounts             — ChartOfAccountEntity
--   finance_journal_entries      — JournalEntryEntity
--   finance_journal_lines        — JournalLineEntity
--   finance_tax_rates            — TaxRateEntity
--
-- Run against: BOOKING_DB_URL (same DB as booking-service).
-- Dependencies: 001–007 must already be applied.
-- Idempotent — CREATE TABLE IF NOT EXISTS + DO $$ guards.
--
-- Global Finance Rules enforced by schema:
--   - debit_minor and credit_minor are INT (no DECIMAL, no FLOAT)
--   - journal_lines has no updated_at / deleted_at (INSERT-only)
--   - journal_entries has no deleted_at (INSERT-only; reversedBy linkage only)
-- =============================================================================

\set ON_ERROR_STOP on

-- ── finance_accounting_periods ────────────────────────────────────────────────
-- One row per calendar month per tenant.
-- Invariant: exactly one row per tenant with status = 'open' at any time.
-- Enforced at application layer (AccountingPeriodService).

CREATE TABLE IF NOT EXISTS finance_accounting_periods (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL,
  period        CHAR(7)      NOT NULL,    -- 'YYYY-MM' e.g. '2026-07'
  status        VARCHAR(15)  NOT NULL DEFAULT 'open',
                                          -- open | closing | closed | locked
  opened_at     TIMESTAMPTZ  NOT NULL,
  closed_at     TIMESTAMPTZ,
  locked_at     TIMESTAMPTZ,
  closed_by_id  UUID,
  locked_by_id  UUID,
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_accounting_periods_tenant_period
  ON finance_accounting_periods (tenant_id, period);

CREATE INDEX IF NOT EXISTS idx_finance_accounting_periods_tenant_status
  ON finance_accounting_periods (tenant_id, status);

-- ── finance_accounts ──────────────────────────────────────────────────────────
-- Chart of Accounts tree.
-- System accounts (is_system = true) are seeded by ChartOfAccountService.
-- Non-system accounts can be created by tenant admins.
-- No account may be hard-deleted: deactivate only (is_active = false).

CREATE TABLE IF NOT EXISTS finance_accounts (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID         NOT NULL,
  code          VARCHAR(10)  NOT NULL,    -- numeric string: '1120', '4110'
  name          VARCHAR(150) NOT NULL,
  description   VARCHAR(500),
  type          VARCHAR(15)  NOT NULL,    -- asset | liability | equity | revenue | expense
  parent_code   VARCHAR(10),             -- null for root category accounts
  is_postable   BOOLEAN      NOT NULL DEFAULT TRUE,
  is_system     BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_accounts_tenant_code
  ON finance_accounts (tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_finance_accounts_tenant_type
  ON finance_accounts (tenant_id, type)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_finance_accounts_parent
  ON finance_accounts (tenant_id, parent_code)
  WHERE parent_code IS NOT NULL;

-- ── finance_journal_entries ───────────────────────────────────────────────────
-- Double-entry journal entry header. INSERT-ONLY — no update, no delete.
-- Reversal linkage: reversal_of / reversed_by (both nullable UUIDs).

CREATE TABLE IF NOT EXISTS finance_journal_entries (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL,
  reference         VARCHAR(30)  NOT NULL,    -- JNL-YYYYMM-NNNNN
  entry_type        VARCHAR(30)  NOT NULL,    -- invoice | payment | refund | ...
  source_type       VARCHAR(30),              -- booking | membership | pos | ...
  source_id         UUID,                     -- cross-service entity UUID
  description       VARCHAR(500) NOT NULL,
  posted_at         TIMESTAMPTZ  NOT NULL,    -- accounting effective date
  accounting_period CHAR(7)      NOT NULL,    -- 'YYYY-MM' denormalised for fast queries
  reversal_of       UUID,                     -- UUID of entry this reverses
  reversed_by       UUID,                     -- UUID of entry that reverses this
  -- No updated_at. No deleted_at. Immutable after insert.
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_journal_entries_tenant_source
  ON finance_journal_entries (tenant_id, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_journal_entries_tenant_period
  ON finance_journal_entries (tenant_id, accounting_period);

CREATE INDEX IF NOT EXISTS idx_finance_journal_entries_tenant_type
  ON finance_journal_entries (tenant_id, entry_type);

CREATE INDEX IF NOT EXISTS idx_finance_journal_entries_tenant_posted
  ON finance_journal_entries (tenant_id, posted_at);

-- ── finance_journal_lines ─────────────────────────────────────────────────────
-- Double-entry lines. INSERT-ONLY.
-- Global Finance Rule: debit_minor and credit_minor are INTEGER only.
-- Exactly one of debit_minor / credit_minor is > 0; the other is 0.
-- ∑ debit_minor = ∑ credit_minor per journal_entry_id (enforced at application layer).

CREATE TABLE IF NOT EXISTS finance_journal_lines (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL,
  journal_entry_id  UUID         NOT NULL,    -- → finance_journal_entries.id (no FK constraint)
  account_code      VARCHAR(10)  NOT NULL,    -- → finance_accounts.code (no FK — immutable ref)
  debit_minor       INT          NOT NULL DEFAULT 0,  -- minor currency units; never DECIMAL
  credit_minor      INT          NOT NULL DEFAULT 0,  -- minor currency units; never DECIMAL
  currency          VARCHAR(3)   NOT NULL DEFAULT 'GBP',
  posted_at         TIMESTAMPTZ  NOT NULL,    -- denormalised from journal_entry for GL queries
  description       VARCHAR(500),
  -- No updated_at. No deleted_at. Immutable after insert.
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Ensure amounts are non-negative
  CONSTRAINT chk_journal_lines_non_negative
    CHECK (debit_minor >= 0 AND credit_minor >= 0),

  -- Ensure exactly one side is non-zero
  CONSTRAINT chk_journal_lines_single_side
    CHECK ((debit_minor = 0) != (credit_minor = 0))
);

CREATE INDEX IF NOT EXISTS idx_finance_journal_lines_tenant_entry
  ON finance_journal_lines (tenant_id, journal_entry_id);

-- Primary GL query index: account + period range
CREATE INDEX IF NOT EXISTS idx_finance_journal_lines_tenant_account_posted
  ON finance_journal_lines (tenant_id, account_code, posted_at);

-- ── finance_tax_rates ─────────────────────────────────────────────────────────
-- Tax rate definitions per tenant.
-- rate_bps: stored in basis points to avoid floating point.
--   1800 = 18.00% GST, 2000 = 20.00% VAT, 0 = zero-rated / exempt.
-- is_inclusive: when TRUE, tax is extracted from the line amount (UK VAT style).
-- is_compound:  when TRUE, tax is applied to the result of prior taxes (India cess).

CREATE TABLE IF NOT EXISTS finance_tax_rates (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID         NOT NULL,
  code            VARCHAR(30)  NOT NULL,    -- 'GST_18' | 'VAT_20' | 'EXEMPT' | 'ZERO'
  name            VARCHAR(100) NOT NULL,
  regime          VARCHAR(20)  NOT NULL,    -- gst | vat | sales_tax | custom
  rate_bps        INT          NOT NULL DEFAULT 0,   -- basis points; 1800 = 18.00%
  jurisdiction    VARCHAR(10),              -- 'IN-MH' | 'IN' | 'GB' | null = global
  is_inclusive    BOOLEAN      NOT NULL DEFAULT FALSE,
  is_compound     BOOLEAN      NOT NULL DEFAULT FALSE,
  applies_to      JSONB,                    -- string[] of line_type values; null = all
  is_default      BOOLEAN      NOT NULL DEFAULT FALSE,
  effective_from  DATE,
  effective_to    DATE,
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Basis points must be non-negative
  CONSTRAINT chk_tax_rate_bps_non_negative CHECK (rate_bps >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_tax_rates_tenant_code
  ON finance_tax_rates (tenant_id, code);

CREATE INDEX IF NOT EXISTS idx_finance_tax_rates_tenant_regime
  ON finance_tax_rates (tenant_id, regime)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_finance_tax_rates_tenant_jurisdiction
  ON finance_tax_rates (tenant_id, jurisdiction)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_finance_tax_rates_tenant_active
  ON finance_tax_rates (tenant_id, is_active);
