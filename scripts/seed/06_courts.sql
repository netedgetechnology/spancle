-- =============================================================================
-- seed/06_courts.sql
-- Creates 8 courts for the Koramangala branch:
--   4 Badminton courts (B1–B4)
--   2 Squash courts    (S1–S2)
--   2 Table Tennis tables (TT1–TT2)
-- Idempotent: re-running is safe.
--
-- Tables written:
--   courts (identity-service DB)
-- =============================================================================

-- ── Badminton courts ──────────────────────────────────────────────────────────

INSERT INTO courts (
  id,
  tenant_id,
  branch_id,
  sport_id,
  name,
  slug,
  description,
  court_type,
  surface_type,
  capacity,
  max_bookings_concurrent,
  dimensions,
  hourly_rate_minor,
  status,
  court_number,
  sort_order,
  is_deleted,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0001-000000003001',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001001',
    'Badminton Court 1',
    'badminton-court-1',
    'Premium full-size BWF standard badminton court with LED lighting.',
    'indoor',
    'wood',
    4,
    1,
    '13.4m × 6.1m',
    50000,  -- ₹500.00 per hour
    'available',
    1,
    0,
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000003002',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001001',
    'Badminton Court 2',
    'badminton-court-2',
    'Full-size BWF standard badminton court with LED lighting.',
    'indoor',
    'wood',
    4,
    1,
    '13.4m × 6.1m',
    50000,
    'available',
    2,
    1,
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000003003',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001001',
    'Badminton Court 3',
    'badminton-court-3',
    'Standard badminton court.',
    'indoor',
    'wood',
    4,
    1,
    '13.4m × 6.1m',
    45000,  -- ₹450.00 (slightly lower rate)
    'available',
    3,
    2,
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000003004',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001001',
    'Badminton Court 4',
    'badminton-court-4',
    'Standard badminton court.',
    'indoor',
    'wood',
    4,
    1,
    '13.4m × 6.1m',
    45000,
    'available',
    4,
    3,
    false,
    NOW(),
    NOW()
  ),

-- ── Squash courts ─────────────────────────────────────────────────────────────

  (
    '00000000-0000-0000-0001-000000003005',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001002',
    'Squash Court 1',
    'squash-court-1',
    'Professional glass-back squash court.',
    'indoor',
    'hard_court',
    4,
    1,
    '6.4m × 9.75m',
    60000,  -- ₹600.00 per hour
    'available',
    1,
    10,
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000003006',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001002',
    'Squash Court 2',
    'squash-court-2',
    'Professional glass-back squash court.',
    'indoor',
    'hard_court',
    4,
    1,
    '6.4m × 9.75m',
    60000,
    'available',
    2,
    11,
    false,
    NOW(),
    NOW()
  ),

-- ── Table tennis tables ───────────────────────────────────────────────────────

  (
    '00000000-0000-0000-0001-000000003007',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001003',
    'TT Table 1',
    'tt-table-1',
    'ITTF-approved Stiga Optimum table.',
    'indoor',
    'other',
    4,
    1,
    '2.74m × 1.525m',
    30000,  -- ₹300.00 per hour
    'available',
    1,
    20,
    false,
    NOW(),
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000003008',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000000100',
    '00000000-0000-0000-0001-000000001003',
    'TT Table 2',
    'tt-table-2',
    'ITTF-approved Stiga Optimum table.',
    'indoor',
    'other',
    4,
    1,
    '2.74m × 1.525m',
    30000,
    'available',
    2,
    21,
    false,
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  hourly_rate_minor = EXCLUDED.hourly_rate_minor,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE '[06_courts] Seeded 8 courts: B1–B4 (badminton), S1–S2 (squash), TT1–TT2 (table tennis)';
END $$;
