-- =============================================================================
-- Migration 013 (booking-service DB) — Finance Engine Refund Engine (Batch 7.4)
--
-- Creates:
--   finance_refunds                  — RefundEntity
--   finance_refund_line_allocations  — RefundLineAllocationEntity
--
-- Modifies:
--   finance_invoices                 — ADD COLUMN amount_refunded_minor
--
-- Run against: BOOKING_DB_URL.
-- Dependencies: Migrations 008–012 must be applied first.
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
--
-- Safety rules:
--   - No DROP. No destructive operations. No data loss.
--   - No WHEN others THEN NULL. No silent error suppression.
--   - \set ON_ERROR_STOP on — aborts immediately on any error.
--   - All monetary columns: INT only. No DECIMAL, FLOAT, NUMERIC, DOUBLE.
--   - INSERT-only semantics enforced at application layer.
--
-- CoA note:
--   Accounts 2180 (Refunds Payable), 2120 (Booking Deferred Revenue),
--   2130 (Membership Deferred Revenue), and 2160 (Tax Payable) already
--   exist in the system CoA seeder. No new accounts required.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── finance_refunds ───────────────────────────────────────────────────────────
--
-- Three-phase refund lifecycle:
--   pending    → Phase A committed: capacity reserved, idempotency key persisted,
--                gateway not yet called
--   processing → Phase C committed: gateway accepted, Step 1 journal posted,
--                component allocations persisted, invoice.amount_refunded_minor updated
--   completed  → Phase C2 committed: Step 2 journal posted, cash disbursed
--   rejected   → Phase D committed: gateway rejected, no journal, capacity released
--
-- Capacity guard: status IN ('pending', 'processing', 'completed')
-- Allocation query: status IN ('processing', 'completed')

CREATE TABLE IF NOT EXISTS finance_refunds (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID         NOT NULL,

  -- Human-readable reference. Format: REF-YYYYMM-NNNNN. Assigned in Phase A.
  refund_number             VARCHAR(20),

  -- Cross-service references (no DB FK — consistent with Finance conventions)
  payment_id                UUID         NOT NULL,   -- → finance_payments.id
  invoice_id                UUID         NOT NULL,   -- → finance_invoices.id

  -- Lifecycle status (varchar — extensible without ALTER TYPE)
  -- pending | processing | completed | rejected
  status                    VARCHAR(20)  NOT NULL DEFAULT 'pending',

  -- Amount being refunded. INT minor currency units only. No DECIMAL, FLOAT.
  amount_minor              INT          NOT NULL,
  currency                  VARCHAR(3)   NOT NULL,

  -- Method determines the CR account in Step 2 journal.
  -- Mirrors PaymentEntity.method values.
  method                    VARCHAR(20)  NOT NULL,

  -- Idempotency key (M7 pattern). Persisted in Phase A before gateway call.
  -- Stable across retries. Format: ref_<uuid>.
  idempotency_key           VARCHAR(64)  NOT NULL,

  -- Gateway-assigned refund ID. Set after Phase B gateway call.
  gateway_refund_id         VARCHAR(100),

  -- Journal linkage
  -- step1_journal_entry_id: posted in Phase C (DR Deferred/Tax / CR Refunds Payable)
  step1_journal_entry_id    UUID,
  -- step2_journal_entry_id: posted in Phase C2 (DR Refunds Payable / CR Cash)
  step2_journal_entry_id    UUID,

  -- Timestamps
  pending_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  processing_at             TIMESTAMPTZ,
  completed_at              TIMESTAMPTZ,
  rejected_at               TIMESTAMPTZ,

  -- Rejection reason (set in Phase D)
  rejection_reason          VARCHAR(500),

  -- Raw gateway response snapshot
  gateway_metadata          JSONB,

  -- Source reference for cross-engine traceability
  source_type               VARCHAR(20),  -- booking | membership | manual
  source_id                 UUID,

  -- Audit
  created_by_id             UUID,
  updated_by_id             UUID,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Amount must be positive
  CONSTRAINT chk_refunds_amount_positive CHECK (amount_minor > 0)
);

-- Idempotency gate (M7): one refund row per (tenant, idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_refunds_idempotency
  ON finance_refunds (tenant_id, idempotency_key);

-- Duplicate journal guard: one Step 1 journal per refund
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_refunds_step1_journal
  ON finance_refunds (tenant_id, step1_journal_entry_id)
  WHERE step1_journal_entry_id IS NOT NULL;

-- Duplicate journal guard: one Step 2 journal per refund
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_refunds_step2_journal
  ON finance_refunds (tenant_id, step2_journal_entry_id)
  WHERE step2_journal_entry_id IS NOT NULL;

-- Payment lookup
CREATE INDEX IF NOT EXISTS idx_finance_refunds_tenant_payment
  ON finance_refunds (tenant_id, payment_id);

-- Invoice lookup (capacity and allocation queries)
CREATE INDEX IF NOT EXISTS idx_finance_refunds_tenant_invoice
  ON finance_refunds (tenant_id, invoice_id);

-- Status sweep
CREATE INDEX IF NOT EXISTS idx_finance_refunds_tenant_status
  ON finance_refunds (tenant_id, status);

-- Gateway refund ID (webhook deduplication)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_refunds_gateway_refund_id
  ON finance_refunds (tenant_id, gateway_refund_id)
  WHERE gateway_refund_id IS NOT NULL;

-- ── finance_refund_line_allocations ───────────────────────────────────────────
--
-- Cumulative-delta component allocation tracker.
-- One row per component (net or tax line) per refund.
-- INSERT-only. Never deleted. Exists only for status IN ('processing', 'completed').
--
-- Enables the cumulative-delta algorithm:
--   SELECT SUM(amount_minor) GROUP BY invoice_tax_id
--   WHERE invoice_id = :id AND status IN ('processing', 'completed')
--   → prior_allocated per component for next refund's largest-remainder computation.

CREATE TABLE IF NOT EXISTS finance_refund_line_allocations (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL,
  refund_id        UUID         NOT NULL,   -- → finance_refunds.id (no DB FK)
  invoice_id       UUID         NOT NULL,   -- → finance_invoices.id (no DB FK)

  -- 'net'  → the net (pre-tax) component of this refund
  -- 'tax'  → a specific tax line from finance_invoice_taxes
  component_type   VARCHAR(10)  NOT NULL,

  -- NULL for component_type = 'net'.
  -- Cross-reference to finance_invoice_taxes.id for 'tax' components.
  invoice_tax_id   UUID,

  -- This refund's allocation to this component. INT only.
  amount_minor     INT          NOT NULL,

  -- INSERT-only. No updated_at.
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_refund_line_amount_non_negative CHECK (amount_minor >= 0)
);

-- Primary lookup: all prior allocations for a given invoice (cumulative-delta query)
CREATE INDEX IF NOT EXISTS idx_finance_refund_line_allocations_invoice
  ON finance_refund_line_allocations (tenant_id, invoice_id);

-- Secondary lookup: all components of a specific refund
CREATE INDEX IF NOT EXISTS idx_finance_refund_line_allocations_refund
  ON finance_refund_line_allocations (tenant_id, refund_id);

-- ── finance_invoices: add amount_refunded_minor ───────────────────────────────
--
-- Tracks cumulative refunds committed against this invoice (processing + completed).
-- Only RefundService writes this field.
-- OutstandingMinor invariant: totalMinor - amountPaidMinor (NOT affected by refund).
-- Terminal 'refunded' condition: amountRefundedMinor >= amountPaidMinor AND outstandingMinor = 0.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_name  = 'finance_invoices'
    AND    column_name = 'amount_refunded_minor'
  ) THEN
    ALTER TABLE finance_invoices
      ADD COLUMN amount_refunded_minor INT NOT NULL DEFAULT 0;

    COMMENT ON COLUMN finance_invoices.amount_refunded_minor IS
      'Cumulative amount refunded against this invoice (processing + completed refunds). '
      'Written exclusively by RefundService under invoice FOR UPDATE lock. '
      'Does not affect outstandingMinor (= totalMinor - amountPaidMinor). '
      'Terminal refunded status requires: amount_refunded_minor >= amount_paid_minor '
      'AND outstanding_minor = 0.';
  END IF;
END $$;
