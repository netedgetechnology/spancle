-- =============================================================================
-- seed/03_tenant_admin.sql
-- Creates the tenant admin user for Ace Sports Club.
-- Idempotent: re-running is safe.
--
-- Tables written:
--   roles, users, identities (identity-service DB)
--
-- Credentials:
--   Email    : admin@acesportsclub.in
--   Password : TenantAdmin@2024!
-- =============================================================================

-- ── 1. Tenant roles ───────────────────────────────────────────────────────────
INSERT INTO roles (id, tenant_id, name, is_deleted, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0001-000000000020', '00000000-0000-0000-0001-000000000001', 'TENANT_ADMIN',   false, NOW(), NOW()),
  ('00000000-0000-0000-0001-000000000021', '00000000-0000-0000-0001-000000000001', 'TENANT_MANAGER', false, NOW(), NOW()),
  ('00000000-0000-0000-0001-000000000022', '00000000-0000-0000-0001-000000000001', 'COACH',          false, NOW(), NOW()),
  ('00000000-0000-0000-0001-000000000023', '00000000-0000-0000-0001-000000000001', 'RECEPTIONIST',   false, NOW(), NOW()),
  ('00000000-0000-0000-0001-000000000024', '00000000-0000-0000-0001-000000000001', 'MEMBER',         false, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ── 2. Tenant admin user ──────────────────────────────────────────────────────
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
) VALUES (
  '00000000-0000-0000-0001-000000000010',
  '00000000-0000-0000-0001-000000000001',
  'Arjun',
  'Sharma',
  'admin@acesportsclub.in',
  '+91-98765-43210',
  'TENANT_ADMIN',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email      = EXCLUDED.email,
  role       = EXCLUDED.role,
  updated_at = NOW();

-- ── 3. Tenant admin identity ──────────────────────────────────────────────────
-- Password: TenantAdmin@2024!  (bcrypt cost 12)
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
  '00000000-0000-0000-0001-000000000011',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000010',
  'admin@acesportsclub.in',
  '$2a$12$387CulpBKRsWUHvWU/yb8OE5xRoIMVBH7tZUtGnBHMB0FyjP3Ay2a',
  true,
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  is_active         = EXCLUDED.is_active,
  is_email_verified = EXCLUDED.is_email_verified,
  updated_at        = NOW();

-- ── 4. Branch manager user (secondary user for demo) ──────────────────────────
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
) VALUES (
  '00000000-0000-0000-0001-000000000012',
  '00000000-0000-0000-0001-000000000001',
  'Priya',
  'Nair',
  'manager@acesportsclub.in',
  '+91-98765-43211',
  'TENANT_MANAGER',
  false,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

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
  '00000000-0000-0000-0001-000000000013',
  '00000000-0000-0000-0001-000000000001',
  '00000000-0000-0000-0001-000000000012',
  'manager@acesportsclub.in',
  '$2a$12$387CulpBKRsWUHvWU/yb8OE5xRoIMVBH7tZUtGnBHMB0FyjP3Ay2a',
  true,
  true,
  0,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  RAISE NOTICE '[03_tenant_admin] Tenant admin seeded: admin@acesportsclub.in / TenantAdmin@2024!';
  RAISE NOTICE '[03_tenant_admin] Branch manager seeded: manager@acesportsclub.in / TenantAdmin@2024!';
END $$;
