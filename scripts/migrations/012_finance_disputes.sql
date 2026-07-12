-- =============================================================================
-- Migration 012 (booking-service DB) — Finance Engine Disputes & Chargebacks
--
-- Creates: finance_disputes (DisputeEntity)
--
-- Run against: BOOKING_DB_URL.
-- Dependencies: Migrations 008–011 must be applied first.
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
--
-- Safety rules:
--   - No DROP. No destructive operations. No data loss.
--   - No silent exception suppression (no WHEN others THEN NULL).
--   - \set ON_ERROR_STOP on — aborts immediately on any error.
--   - All monetary columns: INT only. No DECIMAL, FLOAT, NUMERIC.
--   - INSERT-only semantics enforced at application layer.
--
-- CoA note:
--   Accounts 1190 (Chargebacks Receivable), 5100 (Payment Processing Fees),
--   and 5210 (Chargeback Expense) already exist in the system CoA seeder.
--   No new chart-of-accounts DDL is required in this migration.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── finance_disputes ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_disputes (
  id                           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                    UUID         NOT NULL,

  -- Human-readable reference. Format: DSP-YYYYMM-NNNNN.
  dispute_number               VARCHAR(20),

  -- Cross-service reference to finance_payments.id (no DB FK).
  payment_id                   UUID         NOT NULL,

  -- Gateway identifier (stripe | razorpay | manual).
  gateway                      VARCHAR(30)  NOT NULL,

  -- Gateway-assigned dispute ID. Part of the uniqueness constraint.
  gateway_dispute_id           VARCHAR(100) NOT NULL,

  -- Dispute reason code from gateway.
  reason                       VARCHAR(60)  NOT NULL,

  -- Lifecycle status (varchar — extensible without ALTER TYPE).
  -- Values: opened | under_review | won | lost | cancelled
  status                       VARCHAR(20)  NOT NULL DEFAULT 'opened',

  -- Amounts — INT minor currency units. No DECIMAL, FLOAT.
  disputed_amount_minor        INT          NOT NULL,
  fee_amount_minor             INT          NOT NULL DEFAULT 0,
  currency                     VARCHAR(3)   NOT NULL,

  -- Dates
  opened_at                    TIMESTAMPTZ  NOT NULL,
  evidence_due_at              TIMESTAMPTZ,
  resolved_at                  TIMESTAMPTZ,

  -- Resolution outcome (won | lost | cancelled) — set when terminal.
  resolution                   VARCHAR(20),

  -- Journal linkage
  -- journal_entry_id: posted atomically when dispute is opened.
  journal_entry_id             UUID,
  -- resolution_journal_entry_id: posted atomically at won/lost/cancel.
  resolution_journal_entry_id  UUID,

  -- Raw gateway dispute payload snapshot.
  metadata                     JSONB,

  -- Audit
  created_by_id                UUID,
  updated_by_id                UUID,
  created_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Amount constraints
  CONSTRAINT chk_disputes_amounts_non_negative
    CHECK (disputed_amount_minor > 0 AND fee_amount_minor >= 0)
);

-- =============================================================================
-- Indexes and uniqueness constraints
-- =============================================================================

-- Idempotency gate: one dispute per (tenant, gateway, gateway_dispute_id).
-- Prevents duplicate disputes from webhook re-delivery.
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_disputes_tenant_gateway_dispute
  ON finance_disputes (tenant_id, gateway, gateway_dispute_id);

-- DB-level guard: one open journal per dispute.
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_disputes_journal_entry
  ON finance_disputes (tenant_id, journal_entry_id)
  WHERE journal_entry_id IS NOT NULL;

-- DB-level guard: one resolution journal per dispute.
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_disputes_resolution_journal
  ON finance_disputes (tenant_id, resolution_journal_entry_id)
  WHERE resolution_journal_entry_id IS NOT NULL;

-- Payment lookup — most common query: "all disputes for payment X".
CREATE INDEX IF NOT EXISTS idx_finance_disputes_tenant_payment
  ON finance_disputes (tenant_id, payment_id);

-- Status sweep — scheduler / admin list by status.
CREATE INDEX IF NOT EXISTS idx_finance_disputes_tenant_status
  ON finance_disputes (tenant_id, status);

-- Evidence deadline sweep — find disputes with approaching evidence deadlines.
CREATE INDEX IF NOT EXISTS idx_finance_disputes_evidence_due
  ON finance_disputes (tenant_id, evidence_due_at)
  WHERE evidence_due_at IS NOT NULL
    AND status IN ('opened', 'under_review');

-- Gateway dispute ID lookup for webhook deduplication.
CREATE INDEX IF NOT EXISTS idx_finance_disputes_gateway_dispute_id
  ON finance_disputes (tenant_id, gateway_dispute_id);
