-- =============================================================================
-- Migration 005 (booking-service DB) — courts_booking table
--
-- Creates the courts_booking table required by CourtEntity in booking-service.
-- Named courts_booking (not courts) to avoid collision with the identity-service
-- courts table on deployments that share a single PostgreSQL instance.
--
-- Run against: BOOKING_DB_URL only.
-- Dependencies: migration 003_booking_rate_cards.sql (rate_cards table).
-- Idempotent — CREATE TABLE IF NOT EXISTS + DO $$ guards.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── Enum types ─────────────────────────────────────────────────────────────--

DO $$
BEGIN
  CREATE TYPE court_surface_type AS ENUM (
    'grass', 'artificial_grass', 'hard_court', 'clay',
    'carpet', 'wood', 'rubber', 'sand', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE court_indoor_outdoor AS ENUM ('indoor', 'outdoor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── courts_booking ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courts_booking (
  id             UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation — every query scoped by tenant_id
  tenant_id      UUID                    NOT NULL,

  -- Cross-service refs (no DB FK — validated at service layer)
  venue_id       UUID                    NOT NULL,   -- → venues.id (same DB)
  branch_id      UUID                    NOT NULL,   -- → identity-service branches.id
  sport_id       UUID,                               -- → identity-service sports.id

  name           VARCHAR(100)            NOT NULL,
  court_number   INT,

  hourly_price   INT,                               -- minor currency units (pence/cents)
  currency       VARCHAR(3)              NOT NULL DEFAULT 'GBP',

  surface        court_surface_type,
  indoor_outdoor court_indoor_outdoor    NOT NULL DEFAULT 'indoor',

  width          DECIMAL(6, 2),                     -- metres
  length         DECIMAL(6, 2),                     -- metres
  capacity       INT,

  slot_duration  INT                     NOT NULL DEFAULT 60,    -- minutes
  buffer_before  INT                     NOT NULL DEFAULT 0,     -- minutes
  buffer_after   INT                     NOT NULL DEFAULT 0,     -- minutes
  display_order  INT                     NOT NULL DEFAULT 0,

  is_bookable    BOOLEAN                 NOT NULL DEFAULT TRUE,
  is_active      BOOLEAN                 NOT NULL DEFAULT TRUE,
  is_deleted     BOOLEAN                 NOT NULL DEFAULT FALSE,

  created_at     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ             NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);

-- ── Indexes ──────────────────────────────────────────────────────────────────

-- Unique: name within venue (partial — excludes soft-deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uq_courts_booking_tenant_venue_name
  ON courts_booking (tenant_id, venue_id, name)
  WHERE is_deleted = FALSE;

-- Unique: court_number within venue (partial — excludes soft-deleted and NULL numbers)
CREATE UNIQUE INDEX IF NOT EXISTS uq_courts_booking_tenant_venue_number
  ON courts_booking (tenant_id, venue_id, court_number)
  WHERE is_deleted = FALSE AND court_number IS NOT NULL;

-- Tenant + venue for listing courts by venue
CREATE INDEX IF NOT EXISTS idx_courts_booking_tenant_venue
  ON courts_booking (tenant_id, venue_id)
  WHERE is_deleted = FALSE;

-- Tenant + isDeleted for tenant-scoped soft-delete queries
CREATE INDEX IF NOT EXISTS idx_courts_booking_tenant_deleted
  ON courts_booking (tenant_id, is_deleted);

-- Tenant + isBookable for availability queries
CREATE INDEX IF NOT EXISTS idx_courts_booking_tenant_bookable
  ON courts_booking (tenant_id, is_bookable)
  WHERE is_deleted = FALSE AND is_active = TRUE;

-- tenant_id standalone (for fast scoped lookups)
CREATE INDEX IF NOT EXISTS idx_courts_booking_tenant_id
  ON courts_booking (tenant_id);
