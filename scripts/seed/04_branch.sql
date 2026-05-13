-- =============================================================================
-- seed/04_branch.sql
-- Creates the Koramangala branch for Ace Sports Club.
-- Idempotent: re-running is safe.
--
-- Tables written:
--   branches (identity-service DB)
-- =============================================================================

INSERT INTO branches (
  id,
  tenant_id,
  name,
  slug,
  description,
  address_line1,
  address_line2,
  city,
  state,
  pincode,
  country,
  phone,
  email,
  geo_label,
  status,
  timings,
  settings,
  manager_user_id,
  sort_order,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000100',
  '00000000-0000-0000-0001-000000000001',
  'Ace Sports Club — Koramangala',
  'ace-koramangala',
  'Premium multi-sport facility in the heart of Koramangala with 8 badminton courts, 4 squash courts, and 6 table tennis tables.',
  '12th Main Road, Koramangala 4th Block',
  'Near Sony Signal',
  'Bengaluru',
  'Karnataka',
  '560034',
  'IN',
  '+91-80-4567-8901',
  'koramangala@acesportsclub.in',
  'Koramangala, Bengaluru',
  'active',
  '{
    "monday":    { "isClosed": false, "openTime": "06:00", "closeTime": "22:00" },
    "tuesday":   { "isClosed": false, "openTime": "06:00", "closeTime": "22:00" },
    "wednesday": { "isClosed": false, "openTime": "06:00", "closeTime": "22:00" },
    "thursday":  { "isClosed": false, "openTime": "06:00", "closeTime": "22:00" },
    "friday":    { "isClosed": false, "openTime": "06:00", "closeTime": "23:00" },
    "saturday":  { "isClosed": false, "openTime": "05:30", "closeTime": "23:00" },
    "sunday":    { "isClosed": false, "openTime": "05:30", "closeTime": "21:00" }
  }'::jsonb,
  '{
    "currency": "INR",
    "stateCode": "29",
    "gstin": "29AADCA1234A1Z5",
    "maxAdvanceBookingDays": 30,
    "bookingLeadTimeHours": 1,
    "cancellationWindowHours": 24,
    "checkInWindowMins": 30
  }'::jsonb,
  '00000000-0000-0000-0001-000000000012',
  0,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  status     = EXCLUDED.status,
  timings    = EXCLUDED.timings,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE '[04_branch] Branch seeded: Ace Sports Club — Koramangala';
END $$;
