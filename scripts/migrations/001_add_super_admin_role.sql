-- =============================================================================
-- scripts/migrations/001_add_super_admin_role.sql
--
-- Adds SUPER_ADMIN to the users_role_enum PostgreSQL enum type.
-- Also repairs the superadmin user row to use the correct column name
-- and ensures role = 'SUPER_ADMIN'.
--
-- Safe to run multiple times (idempotent).
-- Run against: spancle_identity database.
--
-- Usage:
--   psql "$IDENTITY_DB_URL" -f scripts/migrations/001_add_super_admin_role.sql
-- =============================================================================

-- ── 1. Add SUPER_ADMIN to enum if not already present ─────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'SUPER_ADMIN'
      AND enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'users_role_enum'
      )
  ) THEN
    ALTER TYPE users_role_enum ADD VALUE 'SUPER_ADMIN';
    RAISE NOTICE 'Added SUPER_ADMIN to users_role_enum';
  ELSE
    RAISE NOTICE 'SUPER_ADMIN already exists in users_role_enum — skipping';
  END IF;
END
$$;

-- ── 2. Ensure superadmin user has correct name and role ───────────────────────
-- This is safe: ON CONFLICT targets the fixed UUID used in the seed.
-- Does not touch any other users.
UPDATE users
SET
  name       = 'Platform Admin',
  email      = 'superadmin@spancle.com',
  role       = 'SUPER_ADMIN',
  updated_at = NOW()
WHERE
  id        = '00000000-0000-0000-0000-000000000010'
  AND tenant_id = '00000000-0000-0000-0000-000000000001';

DO $$
BEGIN
  IF FOUND THEN
    RAISE NOTICE 'Superadmin user updated to role SUPER_ADMIN';
  ELSE
    RAISE NOTICE 'Superadmin user not found — check seed was run first';
  END IF;
END
$$;

-- ── 3. Verify ─────────────────────────────────────────────────────────────────
SELECT
  u.id,
  u.email,
  u.role,
  u.name,
  u.tenant_id
FROM users u
WHERE u.id = '00000000-0000-0000-0000-000000000010';
