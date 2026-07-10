-- =============================================================================
-- Migration 009 (booking-service DB) — Finance Engine Invoice Foundation
--
-- Creates tables required by FinanceModule Batch 7.1B:
--   finance_invoices            — InvoiceEntity
--   finance_invoice_lines       — InvoiceLineEntity
--   finance_invoice_taxes       — InvoiceTaxEntity
--   finance_invoice_references  — InvoiceReferenceEntity
--
-- Run against: BOOKING_DB_URL.
-- Dependencies: Migration 008 (finance_accounting_periods, finance_accounts,
--               finance_journal_entries, finance_journal_lines) must be applied first.
-- Idempotent — CREATE TABLE IF NOT EXISTS + IF NOT EXISTS indexes.
--
-- Global Finance Rules enforced:
--   - All monetary columns: INT only (minor currency units). No DECIMAL, FLOAT.
--   - invoice_lines: INSERT-only after finalisation — no deleted_at.
--   - invoice_taxes: INSERT-only — no updated_at, no deleted_at.
--   - invoice_references: INSERT-only — idempotency gate with UNIQUE constraint.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── finance_invoices ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_invoices (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL,

  -- Invoice number: INV-YYYY-NNNNN. NULL while in draft.
  -- Assigned at finalise() and immutable thereafter.
  invoice_number    VARCHAR(20),

  status            VARCHAR(20)   NOT NULL DEFAULT 'draft',
  -- open states: draft | pending | issued | partially_paid
  -- terminal states: paid | voided

  -- Source reference (cross-service, no DB FK — Finance never calls other engines)
  source_type       VARCHAR(20)   NOT NULL,
  -- booking | membership | academy | tournament | pos | marketplace | manual
  source_id         UUID,

  -- Customer snapshot (Finance never calls Identity to re-fetch)
  customer_id       UUID,
  customer_name     VARCHAR(200)  NOT NULL,
  customer_email    VARCHAR(250),

  -- Currency (ISO-4217)
  currency          VARCHAR(3)    NOT NULL DEFAULT 'GBP',

  -- Amounts — all INT minor currency units. No DECIMAL. No FLOAT.
  subtotal_minor    INT           NOT NULL DEFAULT 0,
  discount_minor    INT           NOT NULL DEFAULT 0,
  tax_minor         INT           NOT NULL DEFAULT 0,
  total_minor       INT           NOT NULL DEFAULT 0,
  amount_paid_minor INT           NOT NULL DEFAULT 0,   -- updated by PaymentService (Batch 7.2)
  outstanding_minor INT           NOT NULL DEFAULT 0,   -- updated by PaymentService

  -- Revenue recognition period (for pro-rata deferred revenue)
  period_start      TIMESTAMPTZ,
  period_end        TIMESTAMPTZ,

  -- Dates
  issued_at         TIMESTAMPTZ,
  due_at            TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  voided_at         TIMESTAMPTZ,
  void_reason       VARCHAR(500),

  -- Journal linkage (populated at finalise())
  journal_entry_id  UUID,   -- → finance_journal_entries.id (no FK — immutable cross-ref)

  -- Pricing traceability (M5)
  coupon_code       VARCHAR(50),

  -- Soft state
  is_deleted        BOOLEAN       NOT NULL DEFAULT FALSE,
  created_by_id     UUID,
  updated_by_id     UUID,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_invoices_tenant_number
  ON finance_invoices (tenant_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_tenant_status
  ON finance_invoices (tenant_id, status)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_tenant_source
  ON finance_invoices (tenant_id, source_type, source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_tenant_customer
  ON finance_invoices (tenant_id, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_tenant_issued
  ON finance_invoices (tenant_id, issued_at)
  WHERE issued_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_tenant_due
  ON finance_invoices (tenant_id, due_at)
  WHERE due_at IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_finance_invoices_tenant_deleted
  ON finance_invoices (tenant_id, is_deleted);

-- ── finance_invoice_lines ─────────────────────────────────────────────────────
-- INSERT-only after parent invoice is finalised.
-- No updated_at. No deleted_at.

CREATE TABLE IF NOT EXISTS finance_invoice_lines (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL,
  invoice_id        UUID          NOT NULL,   -- → finance_invoices.id (no FK)

  description       VARCHAR(500)  NOT NULL,
  line_type         VARCHAR(40)   NOT NULL,
  quantity          INT           NOT NULL DEFAULT 1,

  -- Amounts — INT minor currency units only
  unit_price_minor  INT           NOT NULL,
  subtotal_minor    INT           NOT NULL,   -- quantity × unit_price_minor
  discount_minor    INT           NOT NULL DEFAULT 0,
  net_minor         INT           NOT NULL,   -- subtotal_minor - discount_minor
  tax_minor         INT           NOT NULL DEFAULT 0,

  -- Pricing traceability (Architecture v1.0 M5)
  applied_rule_ids  JSONB,                    -- string[] of PricingRule UUIDs
  coupon_code       VARCHAR(50),
  coupon_rule_id    UUID,                     -- PricingRule.id of coupon
  discount_source   VARCHAR(30),              -- promotion | coupon | member | membership_tier | manual

  -- Source traceability
  line_source_id    UUID,                     -- slotId, planId, tournamentId, etc.

  sort_order        INT           NOT NULL DEFAULT 0,

  -- INSERT-only. No updated_at.
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_invoice_lines_tenant_invoice
  ON finance_invoice_lines (tenant_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_finance_invoice_lines_line_source
  ON finance_invoice_lines (tenant_id, line_source_id)
  WHERE line_source_id IS NOT NULL;

-- ── finance_invoice_taxes ─────────────────────────────────────────────────────
-- Computed tax snapshot per TaxRate per invoice.
-- INSERT-only at finalise(). Values are immutable snapshots of the rate at
-- calculation time — not live FK references.

CREATE TABLE IF NOT EXISTS finance_invoice_taxes (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL,
  invoice_id     UUID         NOT NULL,   -- → finance_invoices.id (no FK)

  -- Snapshotted from TaxRateEntity at calculation time
  tax_code       VARCHAR(30)  NOT NULL,
  tax_name       VARCHAR(100) NOT NULL,
  regime         VARCHAR(20)  NOT NULL,   -- gst | vat | sales_tax | custom

  -- rate_bps: basis points — 1800 = 18.00%. INT only.
  rate_bps       INT          NOT NULL,

  -- Amounts — INT minor currency units
  taxable_minor  INT          NOT NULL,
  tax_minor      INT          NOT NULL,

  is_inclusive   BOOLEAN      NOT NULL,
  is_compound    BOOLEAN      NOT NULL,

  -- INSERT-only. No updated_at.
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_invoice_taxes_tenant_invoice
  ON finance_invoice_taxes (tenant_id, invoice_id);

-- ── finance_invoice_references ────────────────────────────────────────────────
-- Architecture v1.0 M4: cross-engine invoice back-reference + idempotency gate.
--
-- Finance writes one row here when an invoice is created for a source entity.
-- Source engines (Booking, Membership, etc.) call GET /internal/invoices?sourceId=
-- which resolves from this table in O(1) without Finance querying the source engine.
--
-- UNIQUE (tenant_id, source_type, source_id) is the idempotency constraint:
-- a duplicate business event for the same source_id returns the existing invoice
-- without creating a duplicate.
-- INSERT-only. Never updated (except invoice_number which is populated after finalise).

CREATE TABLE IF NOT EXISTS finance_invoice_references (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL,
  invoice_id     UUID         NOT NULL,

  -- Denormalised for display without join to finance_invoices.
  -- Set to NULL on creation; updated to invoice_number after finalise().
  invoice_number VARCHAR(20),

  source_type    VARCHAR(20)  NOT NULL,
  source_id      UUID         NOT NULL,

  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Idempotency gate: one invoice per (tenant, source_type, source_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_invoice_references_source
  ON finance_invoice_references (tenant_id, source_type, source_id);

CREATE INDEX IF NOT EXISTS idx_finance_invoice_references_tenant_invoice
  ON finance_invoice_references (tenant_id, invoice_id);
