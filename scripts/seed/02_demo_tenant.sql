-- =============================================================================
-- seed/02_demo_tenant.sql
-- Creates the Phase 1 demo tenant (Ace Sports Club).
-- Idempotent: re-running is safe.
--
-- Tables written:
--   tenants (identity-service DB)
-- =============================================================================

INSERT INTO tenants (
  id,
  name,
  slug,
  email,
  phone,
  website,
  status,
  tier,
  settings,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0001-000000000001',
  'Ace Sports Club',
  'ace-sports-club',
  'admin@acesportsclub.in',
  '+91-98765-43210',
  'https://acesportsclub.in',
  'active',
  'growth',
  '{
    "currency": "INR",
    "locale": "en-IN",
    "timezone": "Asia/Kolkata",
    "gstRegistered": true,
    "gstin": "29AADCA1234A1Z5",
    "stateCode": "29",
    "bookingLeadTimeHours": 1,
    "maxAdvanceBookingDays": 30,
    "cancellationWindowHours": 24,
    "noShowGraceMins": 30,
    "paymentGateway": "razorpay",
    "features": {
      "recurringBookings": true,
      "membershipPricing": true,
      "qrCheckin": true,
      "onlinePayments": true
    }
  }'::jsonb,
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  status     = EXCLUDED.status,
  tier       = EXCLUDED.tier,
  settings   = EXCLUDED.settings,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE '[02_demo_tenant] Demo tenant seeded: Ace Sports Club (ace-sports-club)';
END $$;
