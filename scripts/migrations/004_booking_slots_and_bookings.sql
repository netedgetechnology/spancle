-- =============================================================================
-- Migration 004 (booking-service DB) — Core booking tables
--
-- Creates: slots, slot_templates, blackouts, holidays, pricing_rules,
--          bookings, booking_logs, booking_payments, booking_refunds
--
-- Run against the BOOKING-SERVICE database only:
--   psql "$BOOKING_DB_URL" -f scripts/migrations/004_booking_slots_and_bookings.sql
--
-- Idempotent — safe to run multiple times.
-- Note: rate_cards already created in migration 003_booking_rate_cards.sql
-- =============================================================================

\set ON_ERROR_STOP on

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE slot_status AS ENUM ('available','reserved','booked','unavailable','cancelled','completed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('pending_payment','confirmed','completed','cancelled','no_show','refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_channel AS ENUM ('online','admin','walk_in','api');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE booking_log_action AS ENUM (
    'created','confirmed','cancelled','completed','no_show_marked','no_show_waived',
    'rescheduled','refunded','payment_recorded','checked_in','notes_updated',
    'recurring_generated','status_changed','payment_failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending','paid','failed','refunded','partially_refunded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('card','cash','bank_transfer','voucher','free');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_status AS ENUM ('pending','processed','failed','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE refund_reason AS ENUM (
    'customer_cancellation','admin_cancellation','no_show_waiver',
    'reschedule','system_error','other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pricing_rule_type AS ENUM ('base','peak','weekend','holiday','member','custom');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE modifier_type AS ENUM ('percentage','fixed','absolute');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pricing_rule_scope AS ENUM ('tenant','branch','sport','court');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── slot_templates ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS slot_templates (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL,
  name              VARCHAR(150) NOT NULL,
  description       TEXT,
  court_id          UUID,
  branch_id         UUID,
  sport_id          UUID,
  duration_mins     INT          NOT NULL DEFAULT 60,
  buffer_mins       INT          NOT NULL DEFAULT 0,
  open_time         VARCHAR(5),
  close_time        VARCHAR(5),
  days_of_week      JSONB,
  auto_publish      BOOLEAN      NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_slot_templates_tenant ON slot_templates (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_slot_templates_court  ON slot_templates (tenant_id, court_id) WHERE is_deleted = FALSE;

-- ── slots ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS slots (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL,
  court_id              UUID        NOT NULL,
  branch_id             UUID        NOT NULL,
  sport_id              UUID,
  template_id           UUID,
  booking_id            UUID,
  start_at              TIMESTAMPTZ NOT NULL,
  end_at                TIMESTAMPTZ NOT NULL,
  duration_mins         INT         NOT NULL,
  status                slot_status NOT NULL DEFAULT 'available',
  max_bookings          INT         NOT NULL DEFAULT 1,
  current_bookings      INT         NOT NULL DEFAULT 0,
  resolved_price_minor  INT,
  price_override_minor  INT,
  applied_rule_ids      JSONB,
  currency              VARCHAR(3)  NOT NULL DEFAULT 'GBP',
  label                 VARCHAR(255),
  notes                 VARCHAR(1000),
  reserved_until        TIMESTAMPTZ,
  is_deleted            BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_slots_tenant_court_start ON slots (tenant_id, court_id, start_at) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_slots_tenant_status      ON slots (tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_slots_tenant_branch      ON slots (tenant_id, branch_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_slots_booking_id         ON slots (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_slots_start_end          ON slots (tenant_id, court_id, start_at, end_at) WHERE is_deleted = FALSE;
-- Overlap query filter: (tenant_id, court_id, status, start_at, end_at) — used by countOverlapping
CREATE INDEX IF NOT EXISTS idx_slots_overlap_check       ON slots (tenant_id, court_id, status, start_at, end_at) WHERE is_deleted = FALSE;
-- Stale reservation expiry job: finds reserved slots past reservedUntil
CREATE INDEX IF NOT EXISTS idx_slots_reserved_until      ON slots (tenant_id, reserved_until) WHERE status = 'reserved' AND reserved_until IS NOT NULL;

-- ── blackouts ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blackouts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  branch_id   UUID,
  court_id    UUID,
  sport_id    UUID,
  name        VARCHAR(150) NOT NULL,
  reason      TEXT,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  blocks_new_bookings BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_blackouts_tenant ON blackouts (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_blackouts_range  ON blackouts (tenant_id, start_at, end_at) WHERE is_deleted = FALSE;

-- ── holidays ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS holidays (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  name        VARCHAR(150) NOT NULL,
  date        DATE        NOT NULL,
  country     VARCHAR(2),
  is_deleted  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (tenant_id, date)
);
CREATE INDEX IF NOT EXISTS idx_holidays_tenant_date ON holidays (tenant_id, date) WHERE is_deleted = FALSE;

-- ── pricing_rules ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_rules (
  id             UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID               NOT NULL,
  name           VARCHAR(150)       NOT NULL,
  description    TEXT,
  rule_type      pricing_rule_type  NOT NULL,
  modifier_type  modifier_type      NOT NULL DEFAULT 'percentage',
  modifier_value INT                NOT NULL,
  scope          pricing_rule_scope NOT NULL DEFAULT 'tenant',
  branch_id      UUID,
  sport_id       UUID,
  court_id       UUID,
  valid_from     DATE,
  valid_until    DATE,
  days_of_week   JSONB,
  time_start     VARCHAR(5),
  time_end       VARCHAR(5),
  priority       INT                NOT NULL DEFAULT 0,
  is_active      BOOLEAN            NOT NULL DEFAULT TRUE,
  is_deleted     BOOLEAN            NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  deleted_at     TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant        ON pricing_rules (tenant_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_type   ON pricing_rules (tenant_id, rule_type) WHERE is_deleted = FALSE AND is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_pricing_rules_tenant_court  ON pricing_rules (tenant_id, court_id) WHERE is_deleted = FALSE;

-- ── bookings ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS bookings (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID            NOT NULL,
  reference             VARCHAR(30)     NOT NULL,
  branch_id             UUID            NOT NULL,
  court_id              UUID            NOT NULL,
  sport_id              UUID,
  slot_ids              JSONB           NOT NULL DEFAULT '[]',
  user_id               UUID,
  customer_name         VARCHAR(255)    NOT NULL,
  customer_email        VARCHAR(254)    NOT NULL,
  customer_phone        VARCHAR(30),
  is_member             BOOLEAN         NOT NULL DEFAULT FALSE,
  status                booking_status  NOT NULL DEFAULT 'pending_payment',
  channel               booking_channel NOT NULL DEFAULT 'online',
  starts_at             TIMESTAMPTZ     NOT NULL,
  ends_at               TIMESTAMPTZ     NOT NULL,
  total_duration_mins   INT             NOT NULL,
  final_price_minor     INT,
  amount_paid_minor     INT             NOT NULL DEFAULT 0,
  amount_refunded_minor INT             NOT NULL DEFAULT 0,
  currency              VARCHAR(3)      NOT NULL DEFAULT 'GBP',
  participant_count     INT             NOT NULL DEFAULT 1,
  customer_notes        TEXT,
  internal_notes        TEXT,
  metadata              JSONB,
  cancelled_at          TIMESTAMPTZ,
  cancelled_by_id       UUID,
  cancellation_reason   VARCHAR(500),
  completed_at          TIMESTAMPTZ,
  checked_in_at         TIMESTAMPTZ,
  created_by_id         UUID,
  updated_by_id         UUID,
  is_deleted            BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  UNIQUE (tenant_id, reference)
);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_status  ON bookings (tenant_id, status)    WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_branch  ON bookings (tenant_id, branch_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_court   ON bookings (tenant_id, court_id)  WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_user    ON bookings (tenant_id, user_id)   WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_created ON bookings (tenant_id, created_at);
-- Date-range booking list queries: starts_at for calendar/reporting
CREATE INDEX IF NOT EXISTS idx_bookings_tenant_starts_at ON bookings (tenant_id, starts_at) WHERE is_deleted = FALSE;
-- Overlap check for confirmed/pending bookings: (court_id, status, starts_at, ends_at)
CREATE INDEX IF NOT EXISTS idx_bookings_overlap_check    ON bookings (tenant_id, court_id, status, starts_at, ends_at) WHERE is_deleted = FALSE;

-- ── booking_logs ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_logs (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID              NOT NULL,
  booking_id      UUID              NOT NULL,
  action          booking_log_action NOT NULL,
  actor_id        UUID,
  actor_type      VARCHAR(30),
  previous_status VARCHAR(50),
  new_status      VARCHAR(50),
  diff            JSONB,
  note            TEXT,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_booking_logs_tenant_booking ON booking_logs (tenant_id, booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_logs_tenant_created ON booking_logs (tenant_id, created_at);

-- ── booking_payments ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_payments (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID           NOT NULL,
  branch_id             UUID           NOT NULL,
  booking_id            UUID           NOT NULL,
  status                payment_status NOT NULL DEFAULT 'pending',
  payment_method        payment_method NOT NULL DEFAULT 'card',
  amount_minor          INT            NOT NULL,
  amount_refunded_minor INT            NOT NULL DEFAULT 0,
  currency              VARCHAR(3)     NOT NULL DEFAULT 'GBP',
  provider              VARCHAR(50),
  provider_payment_id   VARCHAR(255),
  provider_receipt_url  VARCHAR(2048),
  idempotency_key       VARCHAR(255)   NOT NULL,
  paid_at               TIMESTAMPTZ,
  failed_at             TIMESTAMPTZ,
  failure_reason        VARCHAR(500),
  metadata              JSONB,
  created_by_id         UUID,
  is_deleted            BOOLEAN        NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ,
  UNIQUE (tenant_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_booking_payments_booking ON booking_payments (tenant_id, booking_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_booking_payments_status  ON booking_payments (tenant_id, status)     WHERE is_deleted = FALSE;

-- ── booking_refunds ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS booking_refunds (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID          NOT NULL,
  branch_id         UUID          NOT NULL,
  booking_id        UUID          NOT NULL,
  payment_id        UUID          NOT NULL,
  status            refund_status NOT NULL DEFAULT 'pending',
  reason            refund_reason NOT NULL DEFAULT 'other',
  amount_minor      INT           NOT NULL,
  currency          VARCHAR(3)    NOT NULL DEFAULT 'GBP',
  reason_notes      VARCHAR(1000),
  provider_refund_id VARCHAR(255),
  processed_at      TIMESTAMPTZ,
  failed_at         TIMESTAMPTZ,
  failure_reason    VARCHAR(500),
  metadata          JSONB,
  created_by_id     UUID          NOT NULL,
  is_deleted        BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_booking_refunds_booking ON booking_refunds (tenant_id, booking_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_booking_refunds_payment ON booking_refunds (tenant_id, payment_id) WHERE is_deleted = FALSE;

-- =============================================================================
-- Migration 004 — Addendum: venue_id column on slots
-- Added in batch 2.1 after SlotEntity.venueId was introduced.
-- Idempotent — DO $$ guard.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'slots' AND column_name = 'venue_id'
  ) THEN
    ALTER TABLE slots ADD COLUMN venue_id UUID;
    COMMENT ON COLUMN slots.venue_id IS
      'Denormalized from courts_booking.venue_id at generation time. '
      'Enables venue-calendar queries without a join. Nullable for legacy rows.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_slots_tenant_venue
  ON slots (tenant_id, venue_id)
  WHERE venue_id IS NOT NULL AND is_deleted = FALSE;

-- =============================================================================
-- Migration 004 — Addendum: booking state machine expansion (batch 3)
-- Adds new BookingStatus values and the expires_at column.
-- Idempotent — DO $$ guards.
-- =============================================================================

-- Extend booking_status enum with new states
DO $$
BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'reserved';
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'checked_in';
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'in_progress';
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rescheduled';
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';
EXCEPTION WHEN others THEN
  -- If ALTER TYPE fails (e.g. in a transaction) the values already exist
  NULL;
END $$;

-- Add expires_at column to bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE bookings ADD COLUMN expires_at TIMESTAMPTZ;
    COMMENT ON COLUMN bookings.expires_at IS
      'Reservation expiry time. When now() > expires_at the booking transitions '
      'to expired and held slots are released. Null for confirmed/terminal bookings.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_expires_at
  ON bookings (tenant_id, expires_at)
  WHERE expires_at IS NOT NULL
    AND status IN ('reserved', 'pending_payment');
