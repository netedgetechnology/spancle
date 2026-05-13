-- =============================================================================
-- seed/09_bookings.sql
-- Seeds slots and sample bookings for the past 7 days and next 7 days.
-- Uses fixed timestamps relative to seed execution date for realism.
-- Idempotent: slots/bookings with fixed IDs use ON CONFLICT DO NOTHING.
--
-- Tables written: (booking-service DB)
--   slots, bookings, booking_logs
--
-- Coverage:
--   Past:   3 completed bookings, 1 cancelled booking, 1 no-show
--   Future: 3 confirmed bookings, 1 pending_payment booking
-- =============================================================================

-- ── Helper: compute seed dates ────────────────────────────────────────────────
DO $$
DECLARE
  v_today       DATE := CURRENT_DATE;
  v_yesterday   TIMESTAMPTZ;
  v_2days_ago   TIMESTAMPTZ;
  v_3days_ago   TIMESTAMPTZ;
  v_tomorrow    TIMESTAMPTZ;
  v_2days_fwd   TIMESTAMPTZ;
  v_3days_fwd   TIMESTAMPTZ;
BEGIN
  RAISE NOTICE 'Seed date: %', v_today;
END $$;

-- ── 1. SLOTS ──────────────────────────────────────────────────────────────────
-- We seed a representative set of 60-min slots on Badminton Court 1
-- for the past 3 days (some booked/completed) and next 3 days (available).
-- Real slot generation happens via SlotGeneratorService; these are demo only.

INSERT INTO slots (
  id,
  tenant_id,
  branch_id,
  court_id,
  sport_id,
  start_at,
  end_at,
  duration_mins,
  status,
  resolved_price_minor,
  currency,
  max_bookings,
  current_bookings,
  is_deleted,
  created_at,
  updated_at
) VALUES

-- ── Past slots (completed / booked) ──────────────────────────────────────────

-- 3 days ago — 08:00 → completed booking by Rohan
(
  '00000000-0000-0000-0001-100000000001',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE - INTERVAL '3 days')::DATE + TIME '08:00',
  (CURRENT_DATE - INTERVAL '3 days')::DATE + TIME '09:00',
  60, 'completed', 45000, 'INR', 1, 1, false, NOW(), NOW()
),

-- 2 days ago — 07:00 → completed booking by Sneha
(
  '00000000-0000-0000-0001-100000000002',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '07:00',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '08:00',
  60, 'completed', 45000, 'INR', 1, 1, false, NOW(), NOW()
),

-- 2 days ago — 18:00 → no-show booking by Karan (peak slot)
(
  '00000000-0000-0000-0001-100000000003',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003002',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '18:00',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '19:00',
  60, 'completed', 62500, 'INR', 1, 1, false, NOW(), NOW()
),

-- Yesterday — 10:00 → cancelled slot (freed)
(
  '00000000-0000-0000-0001-100000000004',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '10:00',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '11:00',
  60, 'available', 50000, 'INR', 1, 0, false, NOW(), NOW()
),

-- Yesterday — 19:00 → completed booking by Divya (peak)
(
  '00000000-0000-0000-0001-100000000005',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003003',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '19:00',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '20:00',
  60, 'completed', 62500, 'INR', 1, 1, false, NOW(), NOW()
),

-- ── Future slots (available / booked) ────────────────────────────────────────

-- Tomorrow — 08:00 → confirmed booking by Rohan
(
  '00000000-0000-0000-0001-100000000011',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '08:00',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '09:00',
  60, 'booked', 45000, 'INR', 1, 1, false, NOW(), NOW()
),

-- Tomorrow — 19:00 → confirmed booking by Sneha (peak)
(
  '00000000-0000-0000-0001-100000000012',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003002',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '19:00',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '20:00',
  60, 'booked', 62500, 'INR', 1, 1, false, NOW(), NOW()
),

-- 2 days fwd — 07:00 → available (no booking)
(
  '00000000-0000-0000-0001-100000000013',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE + INTERVAL '2 days')::DATE + TIME '07:00',
  (CURRENT_DATE + INTERVAL '2 days')::DATE + TIME '08:00',
  60, 'available', 45000, 'INR', 1, 0, false, NOW(), NOW()
),

-- 2 days fwd — 20:00 → pending_payment booking by Amit
(
  '00000000-0000-0000-0001-100000000014',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003004',
  '00000000-0000-0000-0001-000000001001',
  (CURRENT_DATE + INTERVAL '2 days')::DATE + TIME '20:00',
  (CURRENT_DATE + INTERVAL '2 days')::DATE + TIME '21:00',
  60, 'reserved', 62500, 'INR', 1, 1, false, NOW(), NOW()
),

-- Squash Court 1 — tomorrow 17:00 → confirmed booking by Karan
(
  '00000000-0000-0000-0001-100000000021',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003005',
  '00000000-0000-0000-0001-000000001002',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '17:00',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '17:45',
  45, 'booked', 60000, 'INR', 1, 1, false, NOW(), NOW()
)

ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  updated_at = NOW();

-- ── 2. BOOKINGS ───────────────────────────────────────────────────────────────

INSERT INTO bookings (
  id,
  tenant_id,
  reference,
  branch_id,
  court_id,
  sport_id,
  slot_ids,
  user_id,
  customer_name,
  customer_email,
  customer_phone,
  is_member,
  channel,
  status,
  starts_at,
  ends_at,
  total_duration_mins,
  final_price_minor,
  amount_paid_minor,
  amount_refunded_minor,
  currency,
  participant_count,
  completed_at,
  cancelled_at,
  is_deleted,
  created_at,
  updated_at
) VALUES

-- BK-001: Completed — Rohan, 3 days ago, morning badminton
(
  '00000000-0000-0000-0001-200000000001',
  '00000000-0000-0000-0001-000000000001',
  'ACE-001',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000001"]',
  '00000000-0000-0000-0001-000000010001',
  'Rohan Mehta',
  'rohan.mehta@example.com',
  '+91-98100-11001',
  true,   -- member
  'online',
  'completed',
  (CURRENT_DATE - INTERVAL '3 days')::DATE + TIME '08:00',
  (CURRENT_DATE - INTERVAL '3 days')::DATE + TIME '09:00',
  60,
  45000,  -- member rate (15% off ₹500 = ₹425, but using flat ₹450 for demo clarity)
  45000,  -- fully paid
  0,
  'INR',
  2,
  (CURRENT_DATE - INTERVAL '3 days')::DATE + TIME '09:05',
  NULL,
  false,
  NOW() - INTERVAL '3 days',
  NOW()
),

-- BK-002: Completed — Sneha, 2 days ago, morning
(
  '00000000-0000-0000-0001-200000000002',
  '00000000-0000-0000-0001-000000000001',
  'ACE-002',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000002"]',
  '00000000-0000-0000-0001-000000010002',
  'Sneha Iyer',
  'sneha.iyer@example.com',
  '+91-98100-11002',
  false,
  'online',
  'completed',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '07:00',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '08:00',
  60,
  45000,
  45000,
  0,
  'INR',
  1,
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '08:03',
  NULL,
  false,
  NOW() - INTERVAL '2 days',
  NOW()
),

-- BK-003: No-show — Karan, 2 days ago, peak evening
(
  '00000000-0000-0000-0001-200000000003',
  '00000000-0000-0000-0001-000000000001',
  'ACE-003',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003002',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000003"]',
  '00000000-0000-0000-0001-000000010003',
  'Karan Bhatia',
  'karan.bhatia@example.com',
  '+91-98100-11003',
  false,
  'walk_in',
  'no_show',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '18:00',
  (CURRENT_DATE - INTERVAL '2 days')::DATE + TIME '19:00',
  60,
  62500,  -- peak +25%
  0,      -- not paid (no-show, no payment collected)
  0,
  'INR',
  2,
  NULL,
  NULL,
  false,
  NOW() - INTERVAL '2 days',
  NOW()
),

-- BK-004: Cancelled — anonymous customer, yesterday
(
  '00000000-0000-0000-0001-200000000004',
  '00000000-0000-0000-0001-000000000001',
  'ACE-004',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000004"]',
  NULL,
  'Walk-in Customer',
  'walkin@example.com',
  NULL,
  false,
  'walk_in',
  'cancelled',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '10:00',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '11:00',
  60,
  50000,
  0,
  0,
  'INR',
  1,
  NULL,
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '09:00',
  false,
  NOW() - INTERVAL '1 day',
  NOW()
),

-- BK-005: Completed — Divya, yesterday, peak evening
(
  '00000000-0000-0000-0001-200000000005',
  '00000000-0000-0000-0001-000000000001',
  'ACE-005',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003003',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000005"]',
  '00000000-0000-0000-0001-000000010004',
  'Divya Pillai',
  'divya.pillai@example.com',
  '+91-98100-11004',
  false,
  'online',
  'completed',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '19:00',
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '20:00',
  60,
  62500,
  62500,
  0,
  'INR',
  2,
  (CURRENT_DATE - INTERVAL '1 day')::DATE + TIME '20:02',
  NULL,
  false,
  NOW() - INTERVAL '1 day',
  NOW()
),

-- BK-006: Confirmed (future) — Rohan, tomorrow morning
(
  '00000000-0000-0000-0001-200000000006',
  '00000000-0000-0000-0001-000000000001',
  'ACE-006',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003001',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000011"]',
  '00000000-0000-0000-0001-000000010001',
  'Rohan Mehta',
  'rohan.mehta@example.com',
  '+91-98100-11001',
  true,
  'online',
  'confirmed',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '08:00',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '09:00',
  60,
  45000,
  45000,
  0,
  'INR',
  2,
  NULL,
  NULL,
  false,
  NOW(),
  NOW()
),

-- BK-007: Confirmed (future) — Sneha, tomorrow evening peak
(
  '00000000-0000-0000-0001-200000000007',
  '00000000-0000-0000-0001-000000000001',
  'ACE-007',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003002',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000012"]',
  '00000000-0000-0000-0001-000000010002',
  'Sneha Iyer',
  'sneha.iyer@example.com',
  '+91-98100-11002',
  false,
  'online',
  'confirmed',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '19:00',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '20:00',
  60,
  62500,
  62500,
  0,
  'INR',
  1,
  NULL,
  NULL,
  false,
  NOW(),
  NOW()
),

-- BK-008: Confirmed (future) — Karan, squash court tomorrow
(
  '00000000-0000-0000-0001-200000000008',
  '00000000-0000-0000-0001-000000000001',
  'ACE-008',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003005',
  '00000000-0000-0000-0001-000000001002',
  '["00000000-0000-0000-0001-100000000021"]',
  '00000000-0000-0000-0001-000000010003',
  'Karan Bhatia',
  'karan.bhatia@example.com',
  '+91-98100-11003',
  false,
  'phone',
  'confirmed',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '17:00',
  (CURRENT_DATE + INTERVAL '1 day')::DATE + TIME '17:45',
  45,
  60000,
  60000,
  0,
  'INR',
  2,
  NULL,
  NULL,
  false,
  NOW(),
  NOW()
),

-- BK-009: Pending payment — Amit, 2 days forward (not yet paid)
(
  '00000000-0000-0000-0001-200000000009',
  '00000000-0000-0000-0001-000000000001',
  'ACE-009',
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000003004',
  '00000000-0000-0000-0001-000000001001',
  '["00000000-0000-0000-0001-100000000014"]',
  '00000000-0000-0000-0001-000000010005',
  'Amit Joshi',
  'amit.joshi@example.com',
  '+91-98100-11005',
  false,
  'online',
  'pending_payment',
  (CURRENT_DATE + INTERVAL '2 days')::DATE + TIME '20:00',
  (CURRENT_DATE + INTERVAL '2 days')::DATE + TIME '21:00',
  60,
  62500,
  0,
  0,
  'INR',
  1,
  NULL,
  NULL,
  false,
  NOW(),
  NOW()
)

ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  updated_at = NOW();

-- ── 3. BOOKING LOGS ───────────────────────────────────────────────────────────

INSERT INTO booking_logs (
  id,
  tenant_id,
  booking_id,
  action,
  actor_id,
  actor_type,
  previous_status,
  new_status,
  note,
  created_at
) VALUES
  -- BK-001 log
  ('00000000-0000-0000-0001-300000000001', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0001-200000000001', 'created',   '00000000-0000-0000-0001-000000010001', 'user',   NULL,       'pending_payment', NULL, NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0001-300000000002', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0001-200000000001', 'confirmed', '00000000-0000-0000-0001-000000000010', 'user',   'pending_payment', 'confirmed', NULL, NOW() - INTERVAL '3 days' + INTERVAL '10 minutes'),
  ('00000000-0000-0000-0001-300000000003', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0001-200000000001', 'completed', 'system', 'system', 'confirmed', 'completed', NULL, NOW() - INTERVAL '3 days' + INTERVAL '65 minutes'),

  -- BK-003 no-show log
  ('00000000-0000-0000-0001-300000000010', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0001-200000000003', 'created',   '00000000-0000-0000-0001-000000000010', 'user',   NULL, 'pending_payment', NULL, NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0001-300000000011', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0001-200000000003', 'no_show_marked', '00000000-0000-0000-0001-000000000010', 'user', 'confirmed', 'no_show', 'Customer did not arrive within grace period', NOW() - INTERVAL '2 days' + INTERVAL '100 minutes'),

  -- BK-004 cancellation log
  ('00000000-0000-0000-0001-300000000020', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0001-200000000004', 'created',   '00000000-0000-0000-0001-000000000010', 'user',   NULL, 'pending_payment', NULL, NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0001-300000000021', '00000000-0000-0000-0001-000000000001',
   '00000000-0000-0000-0001-200000000004', 'cancelled', '00000000-0000-0000-0001-000000010004', 'user',   'confirmed', 'cancelled', 'Customer requested cancellation', NOW() - INTERVAL '1 day' + INTERVAL '30 minutes')

ON CONFLICT (id) DO NOTHING;

-- Update slot booking_id references
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000001' WHERE id = '00000000-0000-0000-0001-100000000001';
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000002' WHERE id = '00000000-0000-0000-0001-100000000002';
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000003' WHERE id = '00000000-0000-0000-0001-100000000003';
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000005' WHERE id = '00000000-0000-0000-0001-100000000005';
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000006' WHERE id = '00000000-0000-0000-0001-100000000011';
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000007' WHERE id = '00000000-0000-0000-0001-100000000012';
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000008' WHERE id = '00000000-0000-0000-0001-100000000021';
UPDATE slots SET booking_id = '00000000-0000-0000-0001-200000000009' WHERE id = '00000000-0000-0000-0001-100000000014';

DO $$ BEGIN
  RAISE NOTICE '[09_bookings] Seeded 10 slots, 9 bookings, 7 log entries';
  RAISE NOTICE '  Past: 3 completed, 1 no-show, 1 cancelled';
  RAISE NOTICE '  Future: 3 confirmed (ACE-006/007/008), 1 pending_payment (ACE-009)';
END $$;
