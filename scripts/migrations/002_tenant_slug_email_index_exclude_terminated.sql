-- =============================================================================
-- scripts/migrations/002_tenant_slug_email_index_exclude_terminated.sql
--
-- Replaces the partial unique indexes on tenants(slug) and tenants(email)
-- so that terminated tenants do NOT block reuse of slug or email.
--
-- Old behaviour: unique on lower(slug) WHERE is_deleted=false
--   → blocked reuse when terminated tenant had is_deleted=false
--
-- New behaviour: unique on lower(slug) WHERE is_deleted=false AND status<>'terminated'
--   → terminated tenants are invisible to the uniqueness constraint
--
-- Safe to run multiple times (idempotent — uses IF EXISTS / IF NOT EXISTS).
-- Run against: the real production DB via PM2 DATABASE_URL.
--
-- Usage on server:
--   export DATABASE_URL="$(tr '\0' '\n' < /proc/$(pm2 pid spancle-identity)/environ | grep '^DATABASE_URL=' | cut -d= -f2-)"
--   psql "$DATABASE_URL" -f /var/www/spancle/scripts/migrations/002_tenant_slug_email_index_exclude_terminated.sql
-- =============================================================================

-- ── 1. Slug unique index ───────────────────────────────────────────────────────

-- Drop any existing slug uniqueness constraint/index (all known variants)
DROP INDEX IF EXISTS idx_tenants_slug_unique;
DROP INDEX IF EXISTS idx_tenants_slug;
DROP INDEX IF EXISTS tenants_slug_key;
DROP INDEX IF EXISTS uq_tenants_slug;
DROP INDEX IF EXISTS uq_tenants_slug_active;

-- Also drop any unique constraint on the slug column itself (TypeORM may create one)
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'tenants'::regclass
      AND contype = 'u'
      AND array_to_string(
            ARRAY(SELECT attname FROM pg_attribute
                  WHERE attrelid = conrelid AND attnum = ANY(conkey)),
            ',') = 'slug'
  LOOP
    EXECUTE 'ALTER TABLE tenants DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END $$;

-- Create new partial unique index: slug unique only among non-deleted, non-terminated tenants
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug_active_unique
  ON tenants (lower(slug))
  WHERE is_deleted = false AND status <> 'terminated';

RAISE NOTICE 'idx_tenants_slug_active_unique created (slug unique among non-terminated tenants)';

-- ── 2. Email unique index ──────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_tenants_email_unique;
DROP INDEX IF EXISTS idx_tenants_email;
DROP INDEX IF EXISTS tenants_email_key;
DROP INDEX IF EXISTS uq_tenants_email;
DROP INDEX IF EXISTS uq_tenants_email_active;

-- Drop any unique constraint on email column
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'tenants'::regclass
      AND contype = 'u'
      AND array_to_string(
            ARRAY(SELECT attname FROM pg_attribute
                  WHERE attrelid = conrelid AND attnum = ANY(conkey)),
            ',') = 'email'
  LOOP
    EXECUTE 'ALTER TABLE tenants DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped constraint: %', r.conname;
  END LOOP;
END $$;

-- Create new partial unique index: email unique only among non-deleted, non-terminated tenants
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_email_active_unique
  ON tenants (lower(email))
  WHERE is_deleted = false AND status <> 'terminated';

RAISE NOTICE 'idx_tenants_email_active_unique created (email unique among non-terminated tenants)';

-- ── 3. Verify ─────────────────────────────────────────────────────────────────

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'tenants'
  AND (indexname LIKE '%slug%' OR indexname LIKE '%email%')
ORDER BY indexname;
