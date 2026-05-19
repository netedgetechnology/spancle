-- =============================================================================
-- scripts/migrations/002_tenant_slug_email_index_exclude_terminated.sql
--
-- Replaces partial unique indexes on tenants(slug) and tenants(email)
-- so terminated tenants do NOT block reuse of slug or email.
--
-- New behaviour:
--   slug  unique WHERE is_deleted = false AND status <> 'terminated'
--   email unique WHERE is_deleted = false AND status <> 'terminated' AND email IS NOT NULL
--
-- Idempotent — safe to run multiple times.
--
-- Usage:
--   export DATABASE_URL="$(tr '\0' '\n' < /proc/$(pm2 pid spancle-identity)/environ | grep '^DATABASE_URL=' | cut -d= -f2-)"
--   psql "$DATABASE_URL" -f /var/www/spancle/scripts/migrations/002_tenant_slug_email_index_exclude_terminated.sql
-- =============================================================================

-- ── 1. Slug ───────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_tenants_slug_unique;
DROP INDEX IF EXISTS idx_tenants_slug;
DROP INDEX IF EXISTS tenants_slug_key;
DROP INDEX IF EXISTS uq_tenants_slug;
DROP INDEX IF EXISTS uq_tenants_slug_active;
DROP INDEX IF EXISTS idx_tenants_slug_active_unique;

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
            ARRAY(
              SELECT attname FROM pg_attribute
              WHERE attrelid = conrelid AND attnum = ANY(conkey)
            ), ','
          ) = 'slug'
  LOOP
    EXECUTE 'ALTER TABLE tenants DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped slug constraint: %', r.conname;
  END LOOP;
END $$;

CREATE UNIQUE INDEX idx_tenants_slug_active_unique
  ON tenants (lower(slug))
  WHERE is_deleted = false AND status <> 'terminated';

-- ── 2. Email ──────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_tenants_email_unique;
DROP INDEX IF EXISTS idx_tenants_email;
DROP INDEX IF EXISTS tenants_email_key;
DROP INDEX IF EXISTS uq_tenants_email;
DROP INDEX IF EXISTS uq_tenants_email_active;
DROP INDEX IF EXISTS idx_tenants_email_active_unique;

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
            ARRAY(
              SELECT attname FROM pg_attribute
              WHERE attrelid = conrelid AND attnum = ANY(conkey)
            ), ','
          ) = 'email'
  LOOP
    EXECUTE 'ALTER TABLE tenants DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    RAISE NOTICE 'Dropped email constraint: %', r.conname;
  END LOOP;
END $$;

CREATE UNIQUE INDEX idx_tenants_email_active_unique
  ON tenants (lower(email))
  WHERE is_deleted = false AND status <> 'terminated' AND email IS NOT NULL;

-- ── 3. Show result ────────────────────────────────────────────────────────────

SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'tenants'
  AND (indexname LIKE '%slug%' OR indexname LIKE '%email%')
ORDER BY indexname;
