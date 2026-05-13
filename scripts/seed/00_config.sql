-- =============================================================================
-- seed/00_config.sql
-- Shared configuration, UUIDs, and idempotency helpers for Phase 1 demo seed.
-- Run this file first — all other seed scripts import these values via DO blocks.
-- =============================================================================

-- PostgreSQL extension for UUID generation (required if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- DEMO CONSTANTS
-- Fixed UUIDs ensure idempotency: re-running seed is always safe.
-- =============================================================================

DO $$ BEGIN
  -- These are only used for documentation; actual inserts use literal UUIDs below.
  RAISE NOTICE '=== SPANCLE PHASE 1 DEMO SEED ===';
  RAISE NOTICE 'Superadmin tenant  : 00000000-0000-0000-0000-000000000001';
  RAISE NOTICE 'Superadmin user    : 00000000-0000-0000-0000-000000000010';
  RAISE NOTICE 'Demo tenant        : 00000000-0000-0000-0001-000000000001';
  RAISE NOTICE 'Tenant admin user  : 00000000-0000-0000-0001-000000000010';
  RAISE NOTICE 'Demo branch        : 00000000-0000-0000-0001-000000000100';
  RAISE NOTICE 'Sport: Badminton   : 00000000-0000-0000-0001-000000001001';
  RAISE NOTICE 'Sport: Squash      : 00000000-0000-0000-0001-000000001002';
  RAISE NOTICE 'Sport: Table Tennis: 00000000-0000-0000-0001-000000001003';
  RAISE NOTICE '====================================';
END $$;
