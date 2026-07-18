-- =============================================================================
-- Migration 020 (saas-platform-service DB) — nullable ruleId on decision snapshots
--
-- Batch 7.5A.1.7: CommercialDecisionSnapshotEntity.ruleId and ruleVersion are
-- made nullable to eliminate sentinel '00000000...' UUIDs when no rule has
-- been evaluated for a decision.
--
-- evaluatedRuleIds[] is added to store all evaluated rule version IDs for
-- audit and replay, replacing the single ruleId/ruleVersion pattern.
--
-- No DROP. No data loss. ON_ERROR_STOP compatible.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── Make ruleId and ruleVersion nullable ──────────────────────────────────────

DO $$
BEGIN
  -- ruleId: drop NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commercial_decision_snapshots'
    AND column_name = 'rule_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE commercial_decision_snapshots
      ALTER COLUMN rule_id DROP NOT NULL;
  END IF;

  -- rule_version: drop NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commercial_decision_snapshots'
    AND column_name = 'rule_version'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE commercial_decision_snapshots
      ALTER COLUMN rule_version DROP NOT NULL;
  END IF;
END $$;

-- ── Add evaluated_rule_ids column ─────────────────────────────────────────────
-- Stores the array of CommercialRuleVersion UUIDs evaluated for this decision.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commercial_decision_snapshots'
    AND column_name = 'evaluated_rule_ids'
  ) THEN
    ALTER TABLE commercial_decision_snapshots
      ADD COLUMN evaluated_rule_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

    COMMENT ON COLUMN commercial_decision_snapshots.evaluated_rule_ids IS
      'Array of CommercialRuleVersion UUIDs evaluated for this decision. '
      'Empty when no rules were evaluated. Replaces single ruleId sentinel pattern.';
  END IF;
END $$;

-- Index for audit queries: "which decisions applied rule version X?"
CREATE INDEX IF NOT EXISTS idx_cds_evaluated_rule_ids
  ON commercial_decision_snapshots USING GIN (evaluated_rule_ids);
