-- =============================================================================
-- Migration 003 (identity-service DB) — Add rate_card_id to courts
--
-- Run against the IDENTITY-SERVICE database only:
--   psql "$IDENTITY_DB_URL" -f scripts/migrations/003_identity_court_rate_card_id.sql
--
-- Idempotent — safe to run multiple times.
-- =============================================================================

\set ON_ERROR_STOP on

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courts' AND column_name = 'rate_card_id'
  ) THEN
    ALTER TABLE courts ADD COLUMN rate_card_id UUID;
    COMMENT ON COLUMN courts.rate_card_id IS
      'FK → rate_cards.id in booking-service DB (cross-service, no DB FK constraint). '
      'When set, Rate Card drives base pricing instead of hourly_rate_minor.';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_courts_rate_card_id
  ON courts (rate_card_id)
  WHERE rate_card_id IS NOT NULL;
