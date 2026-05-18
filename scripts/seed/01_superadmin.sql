-- =============================================================================
-- seed/01_superadmin.sql
-- Creates the platform superadmin tenant and superadmin user.
-- Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE throughout.
--
-- Tables written:
--   tenants, users, roles, identities (identity-service DB)
--
-- Credentials:
--   Email    : superadmin@spancle.io
--   Password : SuperAdmin@2024!
-- =============================================================================

-- ── Constants ─────────────────────────────────────────────────────────────────
-- Superadmin tenant is the platform operator's own tenant.
-- All SUPER_ADMIN identities belong here.

\set SUPERADMIN_TENANT_ID '00000000-0000-0000-0000-000000000001'
\set SUPERADMIN_USER_ID   '00000000-0000-0000-0000-000000000010'
\set SUPERADMIN_ROLE_ID   '00000000-0000-0000-0000-000000000011'
\set SUPERADMIN_IDENTITY_ID '00000000-0000-0000-0000-000000000012'

-- ── 1. Superadmin tenant ──────────────────────────────────────────────────────
INSERT INTO tenants (
  id,
  name,
  slug,
  email,
  status,
  tier,
  settings,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Spancle Platform',
  'spancle-platform',
  'platform@spancle.io',
  'active',
  'enterprise',
  '{}',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status     = EXCLUDED.status,
  updated_at = NOW();

-- ── 2. Superadmin role ────────────────────────────────────────────────────────
INSERT INTO roles (
  id,
  tenant_id,
  name,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000011',
  '00000000-0000-0000-0000-000000000001',
  'SUPER_ADMIN',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Superadmin user ────────────────────────────────────────────────────────
INSERT INTO users (
  id,
  tenant_id,
  name,
  email,
  role,
  is_deleted,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Platform Admin',
  'superadmin@spancle.com',
  'SUPER_ADMIN',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name       = EXCLUDED.name,
  email      = EXCLUDED.email,
  role       = 'SUPER_ADMIN',
  updated_at = NOW();

-- ── 4. Superadmin identity (credentials) ─────────────────────────────────────
-- Password: SuperAdmin@2024!  (bcrypt cost 12)
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
) VALUES (
  '00000000-0000-0000-0000-000000000012',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'superadmin@spancle.com',
  '$2a$12$pccC/y0MirtIChH8fp/JweLSeM2FAcDq2iA8NfiQNoaejDlIGci1m',
  true,
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  is_active          = EXCLUDED.is_active,
  is_email_verified  = EXCLUDED.is_email_verified,
  updated_at         = NOW();

DO $$ BEGIN
  RAISE NOTICE '[01_superadmin] Superadmin user seeded: superadmin@spancle.io / SuperAdmin@2024!';
END $$;
