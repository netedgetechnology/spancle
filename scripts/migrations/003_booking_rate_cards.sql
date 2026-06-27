-- =============================================================================
-- Migration 003 (booking-service DB) — Create rate_cards table
--
-- Run against the BOOKING-SERVICE database only:
--   psql "$BOOKING_DB_URL" -f scripts/migrations/003_booking_rate_cards.sql
--
-- Idempotent — safe to run multiple times.
-- =============================================================================

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS rate_cards (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID          NOT NULL,
  name                VARCHAR(150)  NOT NULL,
  description         TEXT,
  currency            VARCHAR(3)    NOT NULL DEFAULT 'GBP',
  default_price_minor INTEGER,
  weekly_grid         JSONB         NOT NULL DEFAULT '{}',
  date_overrides      JSONB         NOT NULL DEFAULT '[]',
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  is_deleted          BOOLEAN       NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant_id
  ON rate_cards (tenant_id);

CREATE INDEX IF NOT EXISTS idx_rate_cards_tenant_active
  ON rate_cards (tenant_id, is_active)
  WHERE is_deleted = FALSE;
