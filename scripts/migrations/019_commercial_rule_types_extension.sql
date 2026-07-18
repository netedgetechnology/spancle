-- =============================================================================
-- Migration 019 (saas-platform-service DB) — Extend commercial rule types
--
-- Batch 7.5A.1.6: adds PROMOTION, TRIAL, TAX to the rule type CHECK constraint.
-- The original constraint in migration 018 is dropped and recreated.
--
-- No DROP on tables. No data loss. No WHEN others THEN NULL.
-- ON_ERROR_STOP compatible.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── Extend commercial_rules.rule_type CHECK constraint ────────────────────────

ALTER TABLE commercial_rules
  DROP CONSTRAINT IF EXISTS chk_commercial_rule_type;

ALTER TABLE commercial_rules
  ADD CONSTRAINT chk_commercial_rule_type
    CHECK (rule_type IN (
      'PRICING',
      'DISCOUNT',
      'ELIGIBILITY',
      'RESTRICTION',
      'DISTRIBUTION',
      'PROMOTION',
      'TRIAL',
      'TAX'
    ));

-- ── Add rule_type column to commercial_rule_versions ─────────────────────────
-- Denormalized from commercial_rules.rule_type for query performance.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commercial_rule_versions' AND column_name = 'rule_type'
  ) THEN
    ALTER TABLE commercial_rule_versions
      ADD COLUMN rule_type VARCHAR(64) NOT NULL DEFAULT 'PRICING';

    ALTER TABLE commercial_rule_versions
      ADD CONSTRAINT chk_rule_version_type
        CHECK (rule_type IN (
          'PRICING','DISCOUNT','ELIGIBILITY','RESTRICTION',
          'DISTRIBUTION','PROMOTION','TRIAL','TAX'
        ));

    CREATE INDEX IF NOT EXISTS idx_crv_tenant_rule_type
      ON commercial_rule_versions (tenant_id, rule_type);
  END IF;
END $$;
