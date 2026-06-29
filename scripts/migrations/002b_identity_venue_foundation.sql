-- =============================================================================
-- Migration 002b (identity-service DB) — Venue Foundation: sports, branches, courts
--
-- Creates the tables required by:
--   SportEntity     → sports
--   SportBranchEntity → sport_branches
--   BranchEntity    → branches
--   CourtEntity     → courts
--
-- This migration supersedes 003_identity_court_rate_card_id.sql on a FRESH
-- deployment: courts is created here with rate_card_id included from the
-- start. On an EXISTING deployment that already ran 003_identity_court_rate_card_id.sql,
-- migration 003 can be skipped because all its changes are idempotent and
-- already contained in this file.
--
-- Run against: IDENTITY_DB_URL (spancle_db / spancle_identity)
-- Dependencies: users and tenants tables must already exist.
-- Order: run AFTER 001 and 002 (superadmin role + tenant indexes).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS, DO $$ guards on enum types,
--             CREATE INDEX IF NOT EXISTS — safe to run multiple times.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── Enum types ────────────────────────────────────────────────────────────────

DO $$
BEGIN
  CREATE TYPE sport_status_enum AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE branch_status_enum AS ENUM ('active', 'inactive', 'suspended', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE court_status_enum AS ENUM ('available', 'unavailable', 'maintenance', 'retired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE court_type_enum AS ENUM ('indoor', 'outdoor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE surface_type_enum AS ENUM (
    'grass', 'artificial_grass', 'hard_court', 'clay', 'carpet',
    'wood', 'rubber', 'sand', 'water', 'ice', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── sports ────────────────────────────────────────────────────────────────────
-- Matches: SportEntity (@Entity('sports'))
-- Unique: (tenant_id, slug)
-- Indexes: (tenant_id), (tenant_id, slug), (tenant_id, status), (tenant_id, is_deleted)

CREATE TABLE IF NOT EXISTS sports (
  id          UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID                 NOT NULL,
  name        VARCHAR(100)         NOT NULL,
  slug        VARCHAR(100)         NOT NULL,
  description TEXT,
  icon        VARCHAR(100),
  color       VARCHAR(7),
  config      JSONB                NOT NULL DEFAULT '{}',
  status      sport_status_enum    NOT NULL DEFAULT 'active',
  sort_order  INT                  NOT NULL DEFAULT 0,
  is_deleted  BOOLEAN              NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT uq_sports_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_sports_tenant_id
  ON sports (tenant_id);

-- Composite unique index already covered by the UNIQUE constraint above;
-- adding a non-unique composite for status queries:
CREATE INDEX IF NOT EXISTS idx_sports_tenant_status
  ON sports (tenant_id, status)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_sports_tenant_deleted
  ON sports (tenant_id, is_deleted);

-- ── sport_branches ────────────────────────────────────────────────────────────
-- Matches: SportBranchEntity (@Entity('sport_branches'))
-- Join table linking sports to branches they are offered at.
-- Unique: (tenant_id, sport_id, branch_id)
-- Indexes: (tenant_id), (tenant_id, sport_id), (tenant_id, branch_id), (tenant_id, is_deleted)

CREATE TABLE IF NOT EXISTS sport_branches (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID         NOT NULL,
  sport_id    UUID         NOT NULL,
  branch_id   UUID         NOT NULL,
  sort_order  INT          NOT NULL DEFAULT 0,
  is_deleted  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  CONSTRAINT uq_sport_branches_tenant_sport_branch UNIQUE (tenant_id, sport_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_sport_branches_tenant_id
  ON sport_branches (tenant_id);

CREATE INDEX IF NOT EXISTS idx_sport_branches_tenant_sport
  ON sport_branches (tenant_id, sport_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_sport_branches_tenant_branch
  ON sport_branches (tenant_id, branch_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_sport_branches_tenant_deleted
  ON sport_branches (tenant_id, is_deleted);

-- ── branches ──────────────────────────────────────────────────────────────────
-- Matches: BranchEntity (@Entity('branches'))
-- Unique: (tenant_id, slug)
-- Indexes: (tenant_id), (tenant_id, slug), (tenant_id, status), (tenant_id, is_deleted)

CREATE TABLE IF NOT EXISTS branches (
  id              UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID                  NOT NULL,
  name            VARCHAR(150)          NOT NULL,
  slug            VARCHAR(100)          NOT NULL,
  description     TEXT,

  -- Address
  address_line1   VARCHAR(255)          NOT NULL,
  address_line2   VARCHAR(255),
  city            VARCHAR(100)          NOT NULL,
  county          VARCHAR(100),
  postcode        VARCHAR(20)           NOT NULL,
  country_code    VARCHAR(2)            NOT NULL DEFAULT 'GB',

  -- Geo (DECIMAL(10,7) ≈ 1cm precision for WGS-84)
  latitude        DECIMAL(10, 7),
  longitude       DECIMAL(10, 7),
  geo_label       VARCHAR(255),

  -- Contact
  phone           VARCHAR(30),
  email           VARCHAR(254),
  website         VARCHAR(2048),

  -- Manager (FK → users.id, enforced at service layer — no DB FK constraint)
  manager_user_id UUID,

  -- Status and timings
  status          branch_status_enum    NOT NULL DEFAULT 'active',

  -- WeeklyTimings JSONB — default: Mon–Fri 09:00–17:00, Sat–Sun closed
  timings         JSONB                 NOT NULL DEFAULT '{
    "monday":    {"isClosed": false, "openTime": "09:00", "closeTime": "17:00"},
    "tuesday":   {"isClosed": false, "openTime": "09:00", "closeTime": "17:00"},
    "wednesday": {"isClosed": false, "openTime": "09:00", "closeTime": "17:00"},
    "thursday":  {"isClosed": false, "openTime": "09:00", "closeTime": "17:00"},
    "friday":    {"isClosed": false, "openTime": "09:00", "closeTime": "17:00"},
    "saturday":  {"isClosed": true,  "openTime": "09:00", "closeTime": "17:00"},
    "sunday":    {"isClosed": true,  "openTime": "09:00", "closeTime": "17:00"}
  }',

  -- Display
  map_url         VARCHAR(2048),
  facilities      JSONB,
  image_url       VARCHAR(2048),
  sort_order      INT                   NOT NULL DEFAULT 0,

  is_deleted      BOOLEAN               NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,

  CONSTRAINT uq_branches_tenant_slug UNIQUE (tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_branches_tenant_id
  ON branches (tenant_id);

CREATE INDEX IF NOT EXISTS idx_branches_tenant_status
  ON branches (tenant_id, status)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_branches_tenant_deleted
  ON branches (tenant_id, is_deleted);

-- For manager queries (branch.repository.ts: findByManager)
CREATE INDEX IF NOT EXISTS idx_branches_tenant_manager
  ON branches (tenant_id, manager_user_id)
  WHERE manager_user_id IS NOT NULL AND is_deleted = FALSE;

-- ── courts ────────────────────────────────────────────────────────────────────
-- Matches: CourtEntity (@Entity('courts'))
-- Unique: (tenant_id, branch_id, name)
-- Indexes: (tenant_id), (tenant_id, branch_id, name), (tenant_id, branch_id),
--          (tenant_id, status), (tenant_id, sport_id), (tenant_id, is_deleted)
-- Note: rate_card_id is included here — supersedes 003_identity_court_rate_card_id.sql
--       for fresh deployments. On existing deployments, migration 003 remains
--       idempotent and safe to skip.

CREATE TABLE IF NOT EXISTS courts (
  id                       UUID                  PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID                  NOT NULL,

  -- FK → branches.id (same tenant) — enforced at service layer, no DB FK constraint
  branch_id                UUID                  NOT NULL,

  -- FK → sports.id (same tenant) — nullable for multi-sport courts
  sport_id                 UUID,

  -- Identity
  name                     VARCHAR(100)          NOT NULL,
  code                     VARCHAR(20),
  description              TEXT,

  -- Physical attributes
  court_type               court_type_enum       NOT NULL DEFAULT 'indoor',
  surface_type             surface_type_enum     NOT NULL DEFAULT 'hard_court',
  capacity                 INT,
  max_bookings_concurrent  INT                   NOT NULL DEFAULT 1,
  dimensions               VARCHAR(50),

  -- Status
  status                   court_status_enum     NOT NULL DEFAULT 'available',
  maintenance_note         VARCHAR(1000),
  maintenance_started_at   TIMESTAMPTZ,
  maintenance_expected_end TIMESTAMPTZ,

  -- Operating hours override (WeeklyTimings JSONB — null = inherit from branch)
  operating_hours          JSONB,

  -- Display / booking
  court_number             INT,
  sort_order               INT                   NOT NULL DEFAULT 0,
  image_url                VARCHAR(2048),
  amenities                JSONB,
  hourly_rate_minor        INT,

  -- Rate Card assignment (FK → rate_cards.id in booking-service DB)
  -- Cross-service boundary: no DB-level FK constraint; enforced at application layer.
  rate_card_id             UUID,

  is_deleted               BOOLEAN               NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ           NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ,

  CONSTRAINT uq_courts_tenant_branch_name UNIQUE (tenant_id, branch_id, name)
);

CREATE INDEX IF NOT EXISTS idx_courts_tenant_id
  ON courts (tenant_id);

-- Composite branch+status for listing courts in a branch with optional status filter
CREATE INDEX IF NOT EXISTS idx_courts_tenant_branch
  ON courts (tenant_id, branch_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_courts_tenant_status
  ON courts (tenant_id, status)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_courts_tenant_sport
  ON courts (tenant_id, sport_id)
  WHERE sport_id IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_courts_tenant_deleted
  ON courts (tenant_id, is_deleted);

-- rate_card_id index — for any future bulk reassignment queries
CREATE INDEX IF NOT EXISTS idx_courts_rate_card_id
  ON courts (rate_card_id)
  WHERE rate_card_id IS NOT NULL;

-- =============================================================================
-- Verification query (informational — shows created tables)
-- =============================================================================
SELECT table_name, (SELECT count(*) FROM information_schema.columns c
  WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS column_count
FROM information_schema.tables t
WHERE t.table_schema = 'public'
  AND t.table_name IN ('sports', 'sport_branches', 'branches', 'courts')
ORDER BY t.table_name;
