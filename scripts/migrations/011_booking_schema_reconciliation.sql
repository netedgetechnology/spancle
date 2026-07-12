-- =============================================================================
-- Migration 011 (booking-service DB) — Booking Schema Reconciliation
--
-- PURPOSE
-- -------
-- Production databases that were initialised with the original
-- 004_booking_slots_and_bookings.sql (before addenda were appended) are
-- missing:
--
--   (a) Five booking_status enum values:
--         reserved, checked_in, in_progress, rescheduled, expired
--
--   (b) The bookings.expires_at column and its scheduler index
--
-- These changes were later appended as addenda to migration 004, but a
-- running production database will not re-execute a migration file it has
-- already applied. This migration 011 applies the same changes forward-only
-- to any database that has already run 004 but not the addenda.
--
-- SAFETY GUARANTEES
-- -----------------
-- * Fully idempotent. Safe to run against a DB that already has the addenda
--   applied (e.g. a fresh install from the full 004 file).
-- * No destructive operations. No DROP. No data loss.
-- * PostgreSQL enum additions are forward-only (ADD VALUE IF NOT EXISTS).
-- * Column addition is guarded by an information_schema existence check.
-- * Index creation uses CREATE INDEX IF NOT EXISTS.
-- * \set ON_ERROR_STOP on — aborts on unexpected errors; no error suppression
--   anywhere in this file.
--
-- RUN AGAINST
-- -----------
-- BOOKING_DB_URL only. Do NOT run against IDENTITY_DB_URL.
--
-- DEPENDENCY
-- ----------
-- Migration 004 must already have been applied (bookings table exists).
-- =============================================================================

\set ON_ERROR_STOP on

-- =============================================================================
-- Part A — Extend booking_status enum
-- =============================================================================
--
-- The original 004 migration created booking_status with only:
--   pending_payment, confirmed, completed, cancelled, no_show, refunded
--
-- The booking state machine (BookingEntity, BookingService, BookingRepository,
-- BookingSchedulerService) requires all 11 values below.
--
-- ADD VALUE IF NOT EXISTS is idempotent: it is a no-op when the value already
-- exists, and raises an error on any other unexpected condition, which psql
-- will surface immediately under \set ON_ERROR_STOP on.
--
-- Compatibility: ADD VALUE IF NOT EXISTS is available from PostgreSQL 9.3.
-- This project requires PostgreSQL 12+ (TypeORM 0.3.x / pg ^8.x constraint).
-- No DO block or EXCEPTION handler is needed or used — any unexpected error
-- propagates directly to the caller.

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked_in';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rescheduled';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';

-- Verification (not executed — for DBA review after applying):
--   SELECT enumlabel FROM pg_enum
--   JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
--   WHERE typname = 'booking_status'
--   ORDER BY enumsortorder;
-- Expected 11 values: pending_payment, confirmed, completed, cancelled,
-- no_show, refunded, reserved, checked_in, in_progress, rescheduled, expired

-- =============================================================================
-- Part B — Add bookings.expires_at column
-- =============================================================================
--
-- Required by:
--   BookingEntity.expiresAt         (@Column expires_at)
--   BookingRepository.findExpiredReservations()
--   BookingSchedulerService.expireStaleReservations()
--
-- The column is nullable TIMESTAMPTZ. Existing rows receive NULL (correct —
-- confirmed/terminal bookings have no expiry time set).
--
-- The DO block uses IF NOT EXISTS to achieve idempotency without suppressing
-- errors: if the IF condition is false the block exits normally; if the
-- ALTER TABLE itself fails for any unexpected reason the error propagates
-- out of the DO block and psql aborts under ON_ERROR_STOP.
-- No EXCEPTION clause is present.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name  = 'bookings'
    AND    column_name = 'expires_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN expires_at TIMESTAMPTZ;

    COMMENT ON COLUMN bookings.expires_at IS
      'Reservation expiry time. When now() > expires_at the booking transitions '
      'to ''expired'' and held slots are released back to ''available''. '
      'Null for confirmed and terminal-state bookings.';

  END IF;
END $$;

-- =============================================================================
-- Part C — Scheduler index on bookings.expires_at
-- =============================================================================
--
-- BookingSchedulerService.expireStaleReservations() runs every 60 seconds
-- and queries:
--   WHERE status IN ('reserved','pending_payment')
--   AND   expires_at < now()
--
-- Without this partial index the query performs a full-table scan.
-- CREATE INDEX IF NOT EXISTS is natively idempotent; no error suppression.

CREATE INDEX IF NOT EXISTS idx_bookings_expires_at
  ON bookings (tenant_id, expires_at)
  WHERE expires_at IS NOT NULL
    AND status IN ('reserved', 'pending_payment');

-- =============================================================================
-- Part D — Scheduler index on bookings.starts_at for in-progress sweep
-- =============================================================================
--
-- BookingRepository.findStartedConfirmed() queries confirmed bookings by
-- starts_at/ends_at. This index exists in migration 004 as
-- idx_bookings_tenant_starts_at; CREATE INDEX IF NOT EXISTS is a no-op if
-- already present. No error suppression.

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_starts_at
  ON bookings (tenant_id, starts_at)
  WHERE is_deleted = FALSE;
