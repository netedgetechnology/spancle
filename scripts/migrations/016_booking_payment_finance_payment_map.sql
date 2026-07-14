-- =============================================================================
-- Migration 016 (booking-service DB) — Booking Payment ↔ Finance Payment Map
--
-- Batch 7.5F: Explicit correlation aggregate replacing gateway-ID inference.
--
-- booking_payment_finance_payment_map records a human/webhook-asserted mapping
-- between a BookingPaymentEntity (booking_payments.id) and a Finance
-- PaymentEntity (finance_payments.id) within the same tenant.
--
-- This mapping is the ONLY authoritative source for Booking→Finance payment
-- correlation. It must never be inferred from:
--   - gateway ID equality
--   - amount equality
--   - timestamp proximity
--   - allocation order
--
-- The mapping is created:
--   - By a payment webhook handler that knows both IDs (correlation_source='webhook')
--   - By an admin API call asserting the mapping explicitly ('api')
--   - Manually by a support operator ('manual')
--   - During a one-time data migration when both IDs are provably related ('migration')
--
-- Run against: BOOKING_DB_URL.
-- Dependencies: Migrations 015 must be applied.
-- Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS.
-- No DROP. No WHEN others THEN NULL. ON_ERROR_STOP compatible.
-- =============================================================================

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS booking_payment_finance_payment_map (
  id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            UUID          NOT NULL,

  -- Booking domain: booking_payments.id (no DB FK — cross-domain boundary)
  booking_payment_id   UUID          NOT NULL,

  -- Finance domain: finance_payments.id (no DB FK — cross-domain boundary)
  finance_payment_id   UUID          NOT NULL,

  -- How this mapping was established.
  -- v1 allowed values: webhook | api | manual | migration
  correlation_source   VARCHAR(30)   NOT NULL,

  -- Optional opaque reference (e.g. webhook event ID, migration batch ID)
  external_reference   VARCHAR(255),

  -- Arbitrary metadata snapshot (gateway event body, admin note, etc.)
  metadata             JSONB         NOT NULL DEFAULT '{}'::jsonb,

  -- Actor who created this mapping (NULL for automated webhook producers)
  created_by_id        UUID,

  -- INSERT-only: no updated_at
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  -- Enforce allowed correlation_source values
  CONSTRAINT chk_bpfpm_correlation_source
    CHECK (correlation_source IN ('webhook', 'api', 'manual', 'migration')),

  -- One explicit mapping per (tenant, booking_payment, finance_payment) pair.
  -- Multiple Finance payments may map to the same Booking payment (e.g. split
  -- Finance allocations) and vice versa — no single-payment uniqueness assumed.
  CONSTRAINT uq_bpfpm_triple
    UNIQUE (tenant_id, booking_payment_id, finance_payment_id)
);

-- Primary lookup: all Finance payments for a given Booking payment
CREATE INDEX IF NOT EXISTS idx_bpfpm_booking_payment
  ON booking_payment_finance_payment_map (tenant_id, booking_payment_id);

-- Reverse lookup: all Booking payments for a given Finance payment
CREATE INDEX IF NOT EXISTS idx_bpfpm_finance_payment
  ON booking_payment_finance_payment_map (tenant_id, finance_payment_id);
