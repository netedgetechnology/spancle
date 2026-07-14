-- =============================================================================
-- Migration 015 (booking-service DB) — Multi-payment refund allocation table
--
-- Batch 7.5D: Corrects single-payment refund capacity defect.
--
-- The booking_refunds table originally assumed one paid payment per booking
-- (payment_id FK on the refund row). Spancle supports multiple paid payments
-- per booking (deposit, partial, balance, split). This table records the exact
-- amount debited from each paid payment for every booking refund.
--
-- Run against: BOOKING_DB_URL.
-- Dependencies: Migration 014 must be applied.
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- No DROP. No WHEN others THEN NULL. ON_ERROR_STOP compatible.
-- Money columns: INT only.
-- =============================================================================

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS booking_refund_payment_allocations (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID         NOT NULL,
  booking_refund_id  UUID         NOT NULL,   -- → booking_refunds.id (no DB FK)
  booking_payment_id UUID         NOT NULL,   -- → booking_payments.id (no DB FK)
  amount_minor       INT          NOT NULL,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_brpa_amount_positive CHECK (amount_minor > 0)
);

-- Idempotency: one allocation per (refund, payment)
CREATE UNIQUE INDEX IF NOT EXISTS uq_brpa_refund_payment
  ON booking_refund_payment_allocations (tenant_id, booking_refund_id, booking_payment_id);

-- Lookup: all allocations for a refund (Finance listener uses this)
CREATE INDEX IF NOT EXISTS idx_brpa_refund
  ON booking_refund_payment_allocations (tenant_id, booking_refund_id);

-- Lookup: all refunds against a payment (payment capacity audit)
CREATE INDEX IF NOT EXISTS idx_brpa_payment
  ON booking_refund_payment_allocations (tenant_id, booking_payment_id);
