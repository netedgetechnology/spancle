-- =============================================================================
-- Migration 003 — Rate Cards and court.rate_card_id
--
-- Creates the rate_cards table in the booking-service database.
-- Adds rate_card_id column to courts table in the identity-service database.
--
-- Run against BOTH databases:
--   psql "$SAAS_DB_URL"     — not needed (rate_cards is not a CMS table)
--   psql "$IDENTITY_DB_URL" -f this file (for courts.rate_card_id)
--   psql "$BOOKING_DB_URL"  -f this file (for rate_cards table)
--
-- The script is idempotent (uses IF NOT EXISTS / DO $$ checks).
-- =============================================================================

\set ON_ERROR_STOP on

-- ── rate_cards (booking-service DB) ──────────────────────────────────────────

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

-- ── courts.rate_card_id (identity-service DB) ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'rate_card_id'
  ) THEN
    ALTER TABLE courts ADD COLUMN rate_card_id UUID;
    COMMENT ON COLUMN courts.rate_card_id IS
      'FK → rate_cards.id in booking-service DB. Cross-service — no DB FK constraint. '
      'When set, Rate Card drives base pricing instead of hourly_rate_minor.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courts_rate_card_id
  ON courts (rate_card_id)
  WHERE rate_card_id IS NOT NULL;
