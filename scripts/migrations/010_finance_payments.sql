-- =============================================================================
-- Migration 010 (booking-service DB) — Finance Engine Payment Foundation
--
-- Creates tables required by FinanceModule Batch 7.2:
--   finance_payments             — PaymentEntity
--   finance_payment_allocations  — PaymentAllocationEntity
--
-- Run against: BOOKING_DB_URL.
-- Dependencies: Migration 009 (finance_invoices) must be applied first.
-- Idempotent — CREATE TABLE IF NOT EXISTS + IF NOT EXISTS indexes.
--
-- Global Finance Rules:
--   - All monetary columns: INT only. No DECIMAL, FLOAT, NUMERIC, DOUBLE.
--   - payment_allocations: INSERT-only (no updated_at).
--   - idempotency_key: UNIQUE per tenant (M7 — prevents duplicate payments).
-- =============================================================================

\set ON_ERROR_STOP on

-- ── finance_payments ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS finance_payments (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID         NOT NULL,

  -- Human-readable reference. Format: PAY-YYYYMM-NNNNN.
  reference                VARCHAR(20),

  status                   VARCHAR(20)  NOT NULL DEFAULT 'initiated',
  -- initiated | authorized | captured | failed | cancelled | chargedback

  method                   VARCHAR(20)  NOT NULL,
  -- online_card | card_present | cash | upi | wallet | bank_transfer | voucher

  -- Gateway identifier — varchar for extensibility. Values: stripe | razorpay | cash | manual
  gateway                  VARCHAR(30)  NOT NULL,

  -- Gateway-assigned identifiers (null until gateway responds)
  gateway_payment_id       VARCHAR(100),
  gateway_status           VARCHAR(50),

  -- Idempotency key (Architecture v1.0 M7) — UNIQUE per tenant
  idempotency_key          VARCHAR(64),

  -- Amounts — all INT minor currency units. No DECIMAL, FLOAT.
  amount_minor             INT          NOT NULL,
  currency                 VARCHAR(3)   NOT NULL DEFAULT 'GBP',
  captured_amount_minor    INT          NOT NULL DEFAULT 0,
  allocated_minor          INT          NOT NULL DEFAULT 0,
  unallocated_minor        INT          NOT NULL DEFAULT 0,

  -- Customer (cross-service UUID reference — no DB FK)
  customer_id              UUID,

  -- Journal linkage — populated at capture() by DoubleEntryService
  journal_entry_id         UUID,

  -- Timestamps
  authorized_at            TIMESTAMPTZ,
  captured_at              TIMESTAMPTZ,
  failed_at                TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  failure_reason           VARCHAR(500),

  -- Raw gateway response snapshot at capture time
  gateway_metadata         JSONB,

  -- Device / network metadata
  ip_address               VARCHAR(45),
  device_id                VARCHAR(100),

  -- Audit
  created_by_id            UUID,
  updated_by_id            UUID,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Non-negative amount guard
  CONSTRAINT chk_payments_amount_non_negative
    CHECK (amount_minor >= 0 AND captured_amount_minor >= 0
       AND allocated_minor >= 0 AND unallocated_minor >= 0)
);

-- Idempotency gate (M7): one payment per (tenant, idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_payments_idempotency
  ON finance_payments (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Webhook deduplication: one record per gateway payment ID
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_payments_gateway_id
  ON finance_payments (tenant_id, gateway_payment_id)
  WHERE gateway_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_payments_tenant_status
  ON finance_payments (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_finance_payments_tenant_customer
  ON finance_payments (tenant_id, customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_payments_tenant_captured
  ON finance_payments (tenant_id, captured_at)
  WHERE captured_at IS NOT NULL;

-- ── finance_payment_allocations ───────────────────────────────────────────────
-- INSERT-only. No updated_at. PaymentService is the sole writer.

CREATE TABLE IF NOT EXISTS finance_payment_allocations (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL,

  -- References (no DB FK — allows independent archival)
  payment_id       UUID         NOT NULL,   -- → finance_payments.id
  invoice_id       UUID         NOT NULL,   -- → finance_invoices.id

  -- Amount allocated from this payment to this invoice. INT only.
  allocated_minor  INT          NOT NULL,
  currency         VARCHAR(3)   NOT NULL,

  -- INSERT-only. No updated_at.
  allocated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Non-negative guard
  CONSTRAINT chk_payment_allocations_non_negative
    CHECK (allocated_minor > 0)
);

-- One allocation per (payment, invoice) pair
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_payment_allocations_pair
  ON finance_payment_allocations (tenant_id, payment_id, invoice_id);

CREATE INDEX IF NOT EXISTS idx_finance_payment_allocations_payment
  ON finance_payment_allocations (tenant_id, payment_id);

CREATE INDEX IF NOT EXISTS idx_finance_payment_allocations_invoice
  ON finance_payment_allocations (tenant_id, invoice_id);
