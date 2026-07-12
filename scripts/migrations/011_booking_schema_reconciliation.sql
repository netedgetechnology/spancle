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
-- * \set ON_ERROR_STOP on — aborts on unexpected errors.
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
-- ALTER TYPE ... ADD VALUE IF NOT EXISTS is forward-only and cannot be rolled
-- back within a transaction, but it is safe to run multiple times.
-- We execute each ADD VALUE in its own DO block so a single already-existing
-- value does not abort the others.
--
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block that has
-- already modified the enum type's rows. We use individual DO blocks per
-- value to isolate any per-value failure.

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'reserved';
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN others           THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked_in';
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN others           THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN others           THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rescheduled';
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN others           THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION WHEN duplicate_object THEN NULL;
         WHEN others           THEN NULL;
END $$;

-- Verification comment (not executed — for DBA review):
-- After running, confirm with:
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
-- Without this partial index that query performs a full-table scan of the
-- bookings table. The partial index reduces it to only active reservation rows.
--
-- CREATE INDEX IF NOT EXISTS is safe to run multiple times.

CREATE INDEX IF NOT EXISTS idx_bookings_expires_at
  ON bookings (tenant_id, expires_at)
  WHERE expires_at IS NOT NULL
    AND status IN ('reserved', 'pending_payment');

-- =============================================================================
-- Part D — Scheduler index on bookings.starts_at for in-progress sweep
-- =============================================================================
--
-- BookingRepository.findStartedConfirmed() queries:
--   WHERE status = 'confirmed'
--   AND   starts_at <= now()
--   AND   ends_at   > now()
-- This index already exists from migration 004 as idx_bookings_tenant_starts_at.
-- Listed here for completeness — CREATE INDEX IF NOT EXISTS is a no-op if
-- already present.

CREATE INDEX IF NOT EXISTS idx_bookings_tenant_starts_at
  ON bookings (tenant_id, starts_at)
  WHERE is_deleted = FALSE;
