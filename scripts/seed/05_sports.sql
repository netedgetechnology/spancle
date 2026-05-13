-- =============================================================================
-- seed/05_sports.sql
-- Creates 3 demo sports and maps them to the Koramangala branch.
-- Idempotent: re-running is safe.
--
-- Tables written:
--   sports, sport_branches (identity-service DB)
-- =============================================================================

-- ── Sports ────────────────────────────────────────────────────────────────────

INSERT INTO sports (
  id,
  tenant_id,
  name,
  slug,
  description,
  icon,
  color,
  config,
  status,
  is_deleted,
  created_at,
  updated_at
) VALUES
  -- Badminton
  (
    '00000000-0000-0000-0001-000000001001',
    '00000000-0000-0000-0001-000000000001',
    'Badminton',
    'badminton',
    'Indoor badminton on BWF-standard courts. Singles and doubles play available.',
    '🏸',
    '#3b82f6',
    '{
      "teamSize": 2,
      "minPlayers": 1,
      "maxPlayers": 4,
      "sessionDurationMins": 60,
      "equipment": ["racket", "shuttlecock", "net"],
      "scoringSystem": "21-point rally",
      "ageGroups": ["juniors", "adults", "seniors"],
      "notes": "BWF-standard courts. Feather shuttles available at counter."
    }'::jsonb,
    'active',
    false,
    NOW(),
    NOW()
  ),
  -- Squash
  (
    '00000000-0000-0000-0001-000000001002',
    '00000000-0000-0000-0001-000000000001',
    'Squash',
    'squash',
    'Glass-back squash courts. PSA singles and doubles format.',
    '🟡',
    '#f59e0b',
    '{
      "teamSize": 2,
      "minPlayers": 1,
      "maxPlayers": 4,
      "sessionDurationMins": 45,
      "equipment": ["racket", "squash_ball"],
      "scoringSystem": "PAR-11 best of 5",
      "ageGroups": ["juniors", "adults"],
      "notes": "Glass-back courts. Warm-up balls available."
    }'::jsonb,
    'active',
    false,
    NOW(),
    NOW()
  ),
  -- Table Tennis
  (
    '00000000-0000-0000-0001-000000001003',
    '00000000-0000-0000-0001-000000000001',
    'Table Tennis',
    'table-tennis',
    'ITTF-standard table tennis tables. Singles and doubles formats.',
    '🏓',
    '#10b981',
    '{
      "teamSize": 2,
      "minPlayers": 1,
      "maxPlayers": 4,
      "sessionDurationMins": 45,
      "equipment": ["paddle", "ball", "table"],
      "scoringSystem": "11-point best of 5",
      "ageGroups": ["juniors", "adults", "seniors"],
      "notes": "ITTF-approved tables. Own paddle welcome."
    }'::jsonb,
    'active',
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  config     = EXCLUDED.config,
  updated_at = NOW();

-- ── Sport-branch mappings ─────────────────────────────────────────────────────

INSERT INTO sport_branches (
  id,
  tenant_id,
  sport_id,
  branch_id,
  sort_order,
  is_deleted,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0001-000000002001',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000001001',
    '00000000-0000-0000-0001-000000000100',
    0,
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000002002',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000001002',
    '00000000-0000-0000-0001-000000000100',
    1,
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000002003',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000001003',
    '00000000-0000-0000-0001-000000000100',
    2,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '[05_sports] Seeded: Badminton, Squash, Table Tennis';
  RAISE NOTICE '[05_sports] All 3 sports mapped to Koramangala branch';
END $$;
