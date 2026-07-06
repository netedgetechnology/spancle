-- =============================================================================
-- Migration 006 (booking-service DB) — QR tables: qr_tokens, qr_scan_logs
--
-- Creates the QR infrastructure tables required by QrModule.
--
-- Run against: BOOKING_DB_URL only.
-- Dependencies: migration 004_booking_slots_and_bookings.sql (bookings table).
-- Idempotent — CREATE TABLE IF NOT EXISTS + DO $$ guards.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── Enum types ─────────────────────────────────────────────────────────────--

DO $$
BEGIN
  CREATE TYPE qr_token_status AS ENUM ('active', 'used', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE qr_token_purpose AS ENUM (
    'booking_checkin', 'access_gate', 'locker_unlock', 'equipment_room', 'visitor_pass'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE qr_scan_outcome AS ENUM (
    'granted', 'denied_expired', 'denied_revoked', 'denied_used',
    'denied_mismatch', 'denied_not_found', 'denied_status',
    'denied_too_early', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── qr_tokens ─────────────────────────────────────────────────────────────--

CREATE TABLE IF NOT EXISTS qr_tokens (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID              NOT NULL,

  -- Cross-service refs (no DB FK — validated at service layer)
  branch_id       UUID              NOT NULL,
  court_id        UUID              NOT NULL,
  booking_id      UUID              NOT NULL,   -- → bookings.id (same DB)
  user_id         UUID,                         -- → identity-service users.id

  -- Token content
  token_hash      VARCHAR(64)       NOT NULL,   -- SHA-256 hex digest — unique
  signed_payload  TEXT              NOT NULL,   -- HMAC-signed JSON payload

  -- Purpose and status
  purpose         qr_token_purpose  NOT NULL DEFAULT 'booking_checkin',
  status          qr_token_status   NOT NULL DEFAULT 'active',

  -- Usage controls
  max_uses        INT               NOT NULL DEFAULT 1,
  use_count       INT               NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ       NOT NULL,
  first_used_at   TIMESTAMPTZ,
  last_used_at    TIMESTAMPTZ,

  -- Access device metadata
  device_id       VARCHAR(100),
  scan_ip         VARCHAR(45),

  -- Revocation
  revoked_at      TIMESTAMPTZ,
  revoked_by_id   UUID,
  revoke_reason   VARCHAR(500),

  -- Audit
  issued_by_id    UUID,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

-- Unique token hash — O(1) lookup on scan
CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_tokens_hash
  ON qr_tokens (token_hash);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_tenant_booking
  ON qr_tokens (tenant_id, booking_id);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_tenant_status
  ON qr_tokens (tenant_id, status)
  WHERE status = 'active';

-- Scheduler sweep for token expiry
CREATE INDEX IF NOT EXISTS idx_qr_tokens_tenant_expires
  ON qr_tokens (tenant_id, expires_at)
  WHERE status = 'active';

-- ── qr_scan_logs ─────────────────────────────────────────────────────────--
-- INSERT only — no UPDATE, no soft-delete, no deleted_at column.

CREATE TABLE IF NOT EXISTS qr_scan_logs (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID              NOT NULL,

  token_id              UUID,             -- null when tokenHash not found (denied_not_found)
  token_hash_presented  VARCHAR(64)       NOT NULL,
  booking_id            UUID,
  branch_id             UUID,
  court_id              UUID,

  outcome               qr_scan_outcome   NOT NULL,
  denial_reason         VARCHAR(500),

  -- Device metadata
  device_id             VARCHAR(100),
  device_firmware       VARCHAR(50),
  scan_ip               VARCHAR(45),
  verification_ms       INT,

  created_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_tenant_booking
  ON qr_scan_logs (tenant_id, booking_id);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_tenant_token
  ON qr_scan_logs (tenant_id, token_id)
  WHERE token_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_tenant_outcome
  ON qr_scan_logs (tenant_id, outcome);

CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_tenant_created
  ON qr_scan_logs (tenant_id, created_at);

-- Device-level scan frequency monitoring (no tenant scope — cross-tenant device)
CREATE INDEX IF NOT EXISTS idx_qr_scan_logs_device
  ON qr_scan_logs (device_id)
  WHERE device_id IS NOT NULL;
