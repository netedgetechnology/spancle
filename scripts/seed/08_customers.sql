-- =============================================================================
-- seed/08_customers.sql
-- Creates 5 sample customer users for Ace Sports Club.
-- Idempotent: re-running is safe.
--
-- All customers have role = 'MEMBER' and password = Customer@2024!
-- Tables written:
--   users, identities (identity-service DB)
-- =============================================================================

-- ── Customer users ────────────────────────────────────────────────────────────

INSERT INTO users (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  role,
  is_deleted,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0001-000000010001',
    '00000000-0000-0000-0001-000000000001',
    'Rohan',
    'Mehta',
    'rohan.mehta@example.com',
    '+91-98100-11001',
    'MEMBER',
    false,
    NOW() - INTERVAL '45 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010002',
    '00000000-0000-0000-0001-000000000001',
    'Sneha',
    'Iyer',
    'sneha.iyer@example.com',
    '+91-98100-11002',
    'MEMBER',
    false,
    NOW() - INTERVAL '30 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010003',
    '00000000-0000-0000-0001-000000000001',
    'Karan',
    'Bhatia',
    'karan.bhatia@example.com',
    '+91-98100-11003',
    'MEMBER',
    false,
    NOW() - INTERVAL '20 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010004',
    '00000000-0000-0000-0001-000000000001',
    'Divya',
    'Pillai',
    'divya.pillai@example.com',
    '+91-98100-11004',
    'MEMBER',
    false,
    NOW() - INTERVAL '10 days',
    NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010005',
    '00000000-0000-0000-0001-000000000001',
    'Amit',
    'Joshi',
    'amit.joshi@example.com',
    '+91-98100-11005',
    'MEMBER',
    false,
    NOW() - INTERVAL '5 days',
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  phone      = EXCLUDED.phone,
  updated_at = NOW();

-- ── Customer identities ───────────────────────────────────────────────────────
-- Password: Customer@2024!  (bcrypt cost 12)

INSERT INTO identities (
  id,
  tenant_id,
  user_id,
  email,
  password_hash,
  is_active,
  is_email_verified,
  failed_login_attempts,
  locked_until,
  created_at,
  updated_at
) VALUES
  (
    '00000000-0000-0000-0001-000000010101',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000010001',
    'rohan.mehta@example.com',
    '$2a$12$BfocIQN7/ZlO2drx2pwB4eL/F9aotjl.kpzmmia5Zp9eCwZWAidMW',
    true, true, 0, NULL,
    NOW() - INTERVAL '45 days', NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010102',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000010002',
    'sneha.iyer@example.com',
    '$2a$12$BfocIQN7/ZlO2drx2pwB4eL/F9aotjl.kpzmmia5Zp9eCwZWAidMW',
    true, true, 0, NULL,
    NOW() - INTERVAL '30 days', NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010103',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000010003',
    'karan.bhatia@example.com',
    '$2a$12$BfocIQN7/ZlO2drx2pwB4eL/F9aotjl.kpzmmia5Zp9eCwZWAidMW',
    true, true, 0, NULL,
    NOW() - INTERVAL '20 days', NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010104',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000010004',
    'divya.pillai@example.com',
    '$2a$12$BfocIQN7/ZlO2drx2pwB4eL/F9aotjl.kpzmmia5Zp9eCwZWAidMW',
    true, true, 0, NULL,
    NOW() - INTERVAL '10 days', NOW()
  ),
  (
    '00000000-0000-0000-0001-000000010105',
    '00000000-0000-0000-0001-000000000001',
    '00000000-0000-0000-0001-000000010005',
    'amit.joshi@example.com',
    '$2a$12$BfocIQN7/ZlO2drx2pwB4eL/F9aotjl.kpzmmia5Zp9eCwZWAidMW',
    true, true, 0, NULL,
    NOW() - INTERVAL '5 days', NOW()
  )
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '[08_customers] 5 customers seeded (password: Customer@2024!)';
  RAISE NOTICE '  rohan.mehta@example.com  (member, 45d ago)';
  RAISE NOTICE '  sneha.iyer@example.com   (member, 30d ago)';
  RAISE NOTICE '  karan.bhatia@example.com (member, 20d ago)';
  RAISE NOTICE '  divya.pillai@example.com (member, 10d ago)';
  RAISE NOTICE '  amit.joshi@example.com   (member, 5d ago)';
END $$;
