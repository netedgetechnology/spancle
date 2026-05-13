-- =============================================================================
-- seed/07_pricing_rules.sql
-- Creates pricing rules for the Koramangala branch.
-- Rules (evaluated in priority order, highest priority wins):
--
--   1. Base rate           (priority 0)  — ₹500/hr badminton, ₹600/hr squash, ₹300/hr TT
--   2. Peak hours          (priority 10) — +25% Mon–Fri 18:00–21:00
--   3. Weekend peak        (priority 10) — +35% Sat–Sun 08:00–12:00
--   4. Morning off-peak   (priority 5)  — −10% all days 06:00–09:00
--   5. Member discount     (priority 20) — −15% for members (overrides peak)
--
-- All amounts in minor currency units (paise). Percentage in basis points.
-- Idempotent: re-running is safe.
--
-- Tables written:
--   pricing_rules (booking-service DB)
-- =============================================================================

-- ── 1. Badminton base rate ─────────────────────────────────────────────────────
INSERT INTO pricing_rules (
  id,
  tenant_id,
  name,
  description,
  rule_type,
  modifier_type,
  modifier_value,
  scope,
  branch_id,
  sport_id,
  court_id,
  priority,
  is_active,
  is_deleted,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0001-000000004001',
    '00000000-0000-0000-0001-000000000001',
    'Badminton — Standard Rate',
    'Base hourly rate for all badminton courts',
    'base',
    'absolute',
    50000,        -- ₹500.00 per hour slot (60 min)
    'sport',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001001',
    NULL,
    0,
    true,
    false,
    NOW(),
    NOW()
  ),

-- ── 2. Squash base rate ────────────────────────────────────────────────────────
  (
    '00000000-0000-0000-0001-000000004002',
    '00000000-0000-0000-0001-000000000001',
    'Squash — Standard Rate',
    'Base hourly rate for all squash courts',
    'base',
    'absolute',
    60000,        -- ₹600.00 per 45-min slot (prorated)
    'sport',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001002',
    NULL,
    0,
    true,
    false,
    NOW(),
    NOW()
  ),

-- ── 3. Table Tennis base rate ─────────────────────────────────────────────────
  (
    '00000000-0000-0000-0001-000000004003',
    '00000000-0000-0000-0001-000000000001',
    'Table Tennis — Standard Rate',
    'Base hourly rate for all TT tables',
    'base',
    'absolute',
    30000,        -- ₹300.00 per hour
    'sport',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001003',
    NULL,
    0,
    true,
    false,
    NOW(),
    NOW()
  ),

-- ── 4. Weekday evening peak (+25%) ────────────────────────────────────────────
  (
    '00000000-0000-0000-0001-000000004010',
    '00000000-0000-0000-0001-000000000001',
    'Weekday Evening Peak',
    'Mon–Fri 18:00–21:00: +25% peak surcharge',
    'peak',
    'percentage',
    2500,         -- +25% in basis points (2500 bps = 25%)
    'branch',
    '00000000-0000-0000-0001-000000000100',
    NULL,
    NULL,
    10,
    true,
    false,
    NOW(),
    NOW()
  ),

-- ── 5. Weekend peak (+35%) ────────────────────────────────────────────────────
  (
    '00000000-0000-0000-0001-000000004011',
    '00000000-0000-0000-0001-000000000001',
    'Weekend Morning Peak',
    'Sat–Sun 08:00–12:00: +35% weekend peak surcharge',
    'weekend',
    'percentage',
    3500,         -- +35%
    'branch',
    '00000000-0000-0000-0001-000000000100',
    NULL,
    NULL,
    10,
    true,
    false,
    NOW(),
    NOW()
  ),

-- ── 6. Morning off-peak discount (−10%) ───────────────────────────────────────
  (
    '00000000-0000-0000-0001-000000004012',
    '00000000-0000-0000-0001-000000000001',
    'Early Morning Off-Peak',
    'All days 06:00–09:00: −10% early-bird discount',
    'custom',
    'percentage',
    -1000,        -- −10% (negative = discount)
    'branch',
    '00000000-0000-0000-0001-000000000100',
    NULL,
    NULL,
    5,
    true,
    false,
    NOW(),
    NOW()
  ),

-- ── 7. Member discount (−15%, highest priority) ───────────────────────────────
  (
    '00000000-0000-0000-0001-000000004020',
    '00000000-0000-0000-0001-000000000001',
    'Member Discount',
    'Active members receive 15% discount on all courts and times',
    'member',
    'percentage',
    -1500,        -- −15%
    'branch',
    '00000000-0000-0000-0001-000000000100',
    NULL,
    NULL,
    20,           -- Highest priority — overrides peak surcharge for members
    true,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  modifier_value = EXCLUDED.modifier_value,
  is_active      = EXCLUDED.is_active,
  updated_at     = NOW();

-- ── Set time/day constraints via separate UPDATE (avoids UPSERT complexity) ───

-- Weekday evening peak: Mon–Fri, 18:00–21:00
UPDATE pricing_rules
SET
  days_of_week = '[1,2,3,4,5]'::jsonb,   -- 1=Mon … 5=Fri
  time_start   = '18:00',
  time_end     = '21:00',
  updated_at   = NOW()
WHERE id = '00000000-0000-0000-0001-000000004010'
  AND tenant_id = '00000000-0000-0000-0001-000000000001';

-- Weekend morning peak: Sat–Sun, 08:00–12:00
UPDATE pricing_rules
SET
  days_of_week = '[0,6]'::jsonb,          -- 0=Sun, 6=Sat
  time_start   = '08:00',
  time_end     = '12:00',
  updated_at   = NOW()
WHERE id = '00000000-0000-0000-0001-000000004011'
  AND tenant_id = '00000000-0000-0000-0001-000000000001';

-- Morning off-peak: all days, 06:00–09:00
UPDATE pricing_rules
SET
  days_of_week = '[0,1,2,3,4,5,6]'::jsonb,
  time_start   = '06:00',
  time_end     = '09:00',
  updated_at   = NOW()
WHERE id = '00000000-0000-0000-0001-000000004012'
  AND tenant_id = '00000000-0000-0000-0001-000000000001';

DO $$ BEGIN
  RAISE NOTICE '[07_pricing_rules] Seeded 7 pricing rules:';
  RAISE NOTICE '  Base: Badminton ₹500, Squash ₹600, TT ₹300';
  RAISE NOTICE '  Peak: +25%% weekday evening, +35%% weekend morning';
  RAISE NOTICE '  Discount: -10%% early morning, -15%% members';
END $$;
