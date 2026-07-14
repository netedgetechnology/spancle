-- =============================================================================
-- Migration 014 (booking-service DB) — booking_refunds idempotency key
--
-- booking_refunds was created in migration 004 without an idempotency_key.
-- Without this constraint a retry of the refund API creates duplicate rows.
-- This migration adds the missing column and unique constraint.
--
-- Run against: BOOKING_DB_URL.
-- Dependencies: Migration 004 must be applied.
-- Idempotent: DO $$ guards on both changes.
-- No DROP. No WHEN others THEN NULL.
-- =============================================================================

\set ON_ERROR_STOP on

-- Add idempotency_key column if absent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE  table_name  = 'booking_refunds'
    AND    column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE booking_refunds
      ADD COLUMN idempotency_key VARCHAR(255);

    COMMENT ON COLUMN booking_refunds.idempotency_key IS
      'Caller-supplied idempotency key. Duplicate refund requests with the same '
      'key return the existing BookingRefundEntity without creating a new row. '
      'Existing rows (before this migration) have NULL and are excluded from the '
      'unique constraint via the WHERE clause.';
  END IF;
END $$;

-- Unique constraint on (tenant_id, idempotency_key) for non-null keys
CREATE UNIQUE INDEX IF NOT EXISTS uq_booking_refunds_idempotency
  ON booking_refunds (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
