-- =============================================================================
-- Migration 007 (booking-service DB) — Membership Engine Foundation
--
-- Creates tables for MembershipModule (Batch 6.1).
-- Run against: BOOKING_DB_URL only.
-- Dependencies: none (self-contained domain).
-- Idempotent — CREATE TABLE IF NOT EXISTS + DO $$ guards.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── membership_plans ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS membership_plans (
  id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID         NOT NULL,
  name                      VARCHAR(150) NOT NULL,
  slug                      VARCHAR(100) NOT NULL,
  description               TEXT,
  membership_type           VARCHAR(50)  NOT NULL,
  currency                  VARCHAR(3)   NOT NULL DEFAULT 'GBP',
  billing_cycle             VARCHAR(20)  NOT NULL DEFAULT 'monthly',
  price_minor               INT          NOT NULL DEFAULT 0,
  setup_fee_minor           INT          NOT NULL DEFAULT 0,
  trial_days                INT          NOT NULL DEFAULT 0,
  auto_renew                BOOLEAN      NOT NULL DEFAULT TRUE,
  grace_period_days         INT          NOT NULL DEFAULT 3,
  max_members               INT,
  max_family_dependants     INT,
  max_corporate_seats       INT,
  refund_on_cancellation    BOOLEAN      NOT NULL DEFAULT FALSE,
  is_public                 BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order                INT          NOT NULL DEFAULT 0,
  is_active                 BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted                BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by_id             UUID,
  updated_by_id             UUID,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at                TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_plans_tenant_slug
  ON membership_plans (tenant_id, slug)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_membership_plans_tenant_active
  ON membership_plans (tenant_id, is_active)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_membership_plans_tenant_deleted
  ON membership_plans (tenant_id, is_deleted);

-- ── membership_plan_benefits ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS membership_plan_benefits (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID         NOT NULL,
  plan_id                  UUID         NOT NULL,
  benefit_type             VARCHAR(80)  NOT NULL,
  units_per_period         INT,
  period_type              VARCHAR(20),
  reset_day                INT          NOT NULL DEFAULT 1,
  rollover_allowed         BOOLEAN      NOT NULL DEFAULT FALSE,
  max_rollover_units       INT,
  transferable             BOOLEAN      NOT NULL DEFAULT FALSE,
  expires_with_membership  BOOLEAN      NOT NULL DEFAULT TRUE,
  sort_order               INT          NOT NULL DEFAULT 0,
  is_deleted               BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_membership_plan_benefits_tenant_plan
  ON membership_plan_benefits (tenant_id, plan_id)
  WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_plan_benefits_type
  ON membership_plan_benefits (tenant_id, plan_id, benefit_type)
  WHERE is_deleted = FALSE;

-- ── memberships ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS memberships (
  id                       UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID         NOT NULL,
  plan_id                  UUID         NOT NULL,
  user_id                  UUID,
  membership_type          VARCHAR(50)  NOT NULL,
  member_number            VARCHAR(30)  NOT NULL,
  status                   VARCHAR(30)  NOT NULL DEFAULT 'pending_payment',
  benefit_snapshot         JSONB        NOT NULL DEFAULT '[]',
  currency                 VARCHAR(3)   NOT NULL DEFAULT 'GBP',
  price_minor              INT          NOT NULL DEFAULT 0,
  auto_renew               BOOLEAN      NOT NULL DEFAULT TRUE,
  enrolled_at              TIMESTAMPTZ,
  activated_at             TIMESTAMPTZ,
  trial_ends_at            TIMESTAMPTZ,
  renews_at                TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  cancellation_reason      VARCHAR(500),
  frozen_at                TIMESTAMPTZ,
  frozen_until             TIMESTAMPTZ,
  total_freeze_days_used   INT          NOT NULL DEFAULT 0,
  pending_downgrade_plan_id UUID,
  parent_membership_id     UUID,         -- FK → memberships.id (self-referential)
  seat_label               VARCHAR(100),
  is_deleted               BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by_id            UUID,
  updated_by_id            UUID,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_tenant_member_number
  ON memberships (tenant_id, member_number)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_user
  ON memberships (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_plan
  ON memberships (tenant_id, plan_id);

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_status
  ON memberships (tenant_id, status)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_renews
  ON memberships (tenant_id, renews_at)
  WHERE status IN ('active', 'pending_renewal', 'payment_failed');

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_expires
  ON memberships (tenant_id, expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_parent
  ON memberships (parent_membership_id)
  WHERE parent_membership_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memberships_tenant_deleted
  ON memberships (tenant_id, is_deleted);

-- ── membership_transactions (INSERT-only ledger) ─────────────────────────────

CREATE TABLE IF NOT EXISTS membership_transactions (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID         NOT NULL,
  membership_id     UUID         NOT NULL,
  user_id           UUID         NOT NULL,
  transaction_type  VARCHAR(30)  NOT NULL,
  benefit_type      VARCHAR(80),
  quantity_delta    INT          NOT NULL,
  balance_before    INT,
  balance_after     INT,
  reference_type    VARCHAR(30),
  reference_id      UUID,
  actor_id          UUID,
  note              TEXT,
  metadata          JSONB,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- No updated_at. No deleted_at. Ledger is immutable.
);

CREATE INDEX IF NOT EXISTS idx_membership_transactions_tenant_membership
  ON membership_transactions (tenant_id, membership_id);

CREATE INDEX IF NOT EXISTS idx_membership_transactions_tenant_user
  ON membership_transactions (tenant_id, user_id);

CREATE INDEX IF NOT EXISTS idx_membership_transactions_reference
  ON membership_transactions (tenant_id, reference_id)
  WHERE reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_transactions_created
  ON membership_transactions (tenant_id, created_at);

-- ── membership_audit_logs (INSERT-only) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS membership_audit_logs (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID         NOT NULL,
  membership_id    UUID         NOT NULL,
  action           VARCHAR(80)  NOT NULL,
  actor_id         VARCHAR(36),
  actor_type       VARCHAR(20)  NOT NULL DEFAULT 'user',
  previous_status  VARCHAR(30),
  new_status       VARCHAR(30),
  note             TEXT,
  diff             JSONB,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
  -- No updated_at. No deleted_at. Audit log is immutable.
);

CREATE INDEX IF NOT EXISTS idx_membership_audit_logs_tenant_membership
  ON membership_audit_logs (tenant_id, membership_id);

CREATE INDEX IF NOT EXISTS idx_membership_audit_logs_tenant_created
  ON membership_audit_logs (tenant_id, created_at);
