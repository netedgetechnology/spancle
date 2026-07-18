-- =============================================================================
-- Migration: commercial_engine_foundation
-- Bounded context: Commercial Engine (Batch 7.5A.1.1)
-- Run against: SAAS_PLATFORM_DB_URL
--
-- Creates all 14 commercial engine tables.
-- No FK constraints (cross-domain boundaries). Application-level integrity.
-- No DROP. No WHEN others THEN NULL. INT money only (basis points for rates).
-- ON_ERROR_STOP compatible.
-- =============================================================================

\set ON_ERROR_STOP on

-- ── 1. commercial_rules ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commercial_rules (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID,
  name             VARCHAR(255) NOT NULL,
  description      TEXT,
  rule_type        VARCHAR(64)  NOT NULL,
  status           VARCHAR(32)  NOT NULL DEFAULT 'DRAFT',
  active_version   VARCHAR(32),
  tags             JSONB        NOT NULL DEFAULT '[]',
  metadata         JSONB        NOT NULL DEFAULT '{}',
  is_deleted       BOOLEAN      NOT NULL DEFAULT FALSE,
  created_by_id    UUID,
  updated_by_id    UUID,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ,

  CONSTRAINT chk_commercial_rule_status
    CHECK (status IN ('DRAFT','ACTIVE','SUSPENDED','ARCHIVED')),
  CONSTRAINT chk_commercial_rule_type
    CHECK (rule_type IN ('PRICING','DISCOUNT','ELIGIBILITY','RESTRICTION','DISTRIBUTION'))
);

CREATE INDEX IF NOT EXISTS idx_commercial_rules_tenant_status
  ON commercial_rules (tenant_id, status) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_commercial_rules_tenant_type
  ON commercial_rules (tenant_id, rule_type) WHERE is_deleted = FALSE;

-- ── 2. commercial_rule_versions ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commercial_rule_versions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID,
  rule_id       UUID         NOT NULL,
  version       VARCHAR(32)  NOT NULL,
  definition    JSONB        NOT NULL DEFAULT '{}',
  changelog     TEXT,
  created_by_id UUID,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_rule_versions_rule_version
  ON commercial_rule_versions (rule_id, version);
CREATE INDEX IF NOT EXISTS idx_commercial_rule_versions_tenant_rule
  ON commercial_rule_versions (tenant_id, rule_id);

-- ── 3. commercial_decision_snapshots ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commercial_decision_snapshots (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  rule_id           UUID        NOT NULL,
  rule_version      VARCHAR(32) NOT NULL,
  subject_type      VARCHAR(64) NOT NULL,
  subject_id        UUID        NOT NULL,
  outcome           VARCHAR(32) NOT NULL,
  input_context     JSONB       NOT NULL DEFAULT '{}',
  result_payload    JSONB       NOT NULL DEFAULT '{}',
  evaluated_by_id   UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_commercial_decision_outcome
    CHECK (outcome IN ('ALLOWED','DENIED','MODIFIED','PENDING'))
);

CREATE INDEX IF NOT EXISTS idx_commercial_decisions_tenant_rule
  ON commercial_decision_snapshots (tenant_id, rule_id);
CREATE INDEX IF NOT EXISTS idx_commercial_decisions_subject
  ON commercial_decision_snapshots (tenant_id, subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_commercial_decisions_created
  ON commercial_decision_snapshots (tenant_id, created_at);

-- NOTE: package_definitions table is owned by the Package module (migration 003+).
-- CommercialEngine uses PackageVersionEntity to add versioning on top.

-- ── 5. package_versions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS package_versions (
  id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id  UUID         NOT NULL,
  version                VARCHAR(32)  NOT NULL,
  features               JSONB        NOT NULL DEFAULT '{}',
  limits                 JSONB        NOT NULL DEFAULT '{}',
  prices                 JSONB        NOT NULL DEFAULT '{}',
  changelog              TEXT,
  created_by_id          UUID,
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_package_versions_pkg_version
  ON package_versions (package_id, version);

-- ── 6. commercial_products ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commercial_products (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  sku          VARCHAR(128) NOT NULL,
  description  TEXT,
  product_type VARCHAR(64)  NOT NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  entitlements JSONB        NOT NULL DEFAULT '{}',
  metadata     JSONB        NOT NULL DEFAULT '{}',
  is_deleted   BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,

  CONSTRAINT chk_commercial_product_type
    CHECK (product_type IN ('SUBSCRIPTION','ONE_TIME','USAGE_BASED','ADDON'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_commercial_products_sku
  ON commercial_products (sku) WHERE is_deleted = FALSE;

-- ── 7. module_registry ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS module_registry (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  key          VARCHAR(128) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description  TEXT,
  version      VARCHAR(32)  NOT NULL DEFAULT '1.0.0',
  is_core      BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  dependencies JSONB        NOT NULL DEFAULT '[]',
  capabilities JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_module_registry_key ON module_registry (key);

-- ── 8. pricing_models ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pricing_models (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID,
  name       VARCHAR(255) NOT NULL,
  model_type VARCHAR(64)  NOT NULL,
  currency   VARCHAR(3)   NOT NULL DEFAULT 'GBP',
  config     JSONB        NOT NULL DEFAULT '{}',
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT chk_pricing_model_type
    CHECK (model_type IN ('FLAT_RATE','PER_UNIT','TIERED','VOLUME','GRADUATED','PACKAGE','CUSTOM'))
);

CREATE INDEX IF NOT EXISTS idx_pricing_models_tenant
  ON pricing_models (tenant_id, model_type) WHERE is_deleted = FALSE;

-- ── 9. payment_ownership_policies ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payment_ownership_policies (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  name                VARCHAR(255) NOT NULL,
  ownership_type      VARCHAR(32)  NOT NULL,
  platform_share_bps  INT          NOT NULL DEFAULT 0,
  config              JSONB        NOT NULL DEFAULT '{}',
  is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted          BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ,

  CONSTRAINT chk_payment_ownership_type
    CHECK (ownership_type IN ('PLATFORM','TENANT','SPLIT')),
  CONSTRAINT chk_platform_share_bps
    CHECK (platform_share_bps >= 0 AND platform_share_bps <= 10000)
);

-- ── 10. revenue_distribution_policies ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS revenue_distribution_policies (
  id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID,
  name              VARCHAR(255) NOT NULL,
  distribution_type VARCHAR(64)  NOT NULL,
  tiers             JSONB        NOT NULL DEFAULT '[]',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  is_deleted        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,

  CONSTRAINT chk_revenue_distribution_type
    CHECK (distribution_type IN ('FLAT_PERCENTAGE','TIERED','FIXED_AMOUNT','NET_REVENUE'))
);

-- ── 11. gateway_definitions ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gateway_definitions (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_type         VARCHAR(64)  NOT NULL,
  display_name         VARCHAR(255) NOT NULL,
  supported_currencies JSONB        NOT NULL DEFAULT '[]',
  capabilities         JSONB        NOT NULL DEFAULT '{}',
  is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
  config_schema        JSONB        NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_gateway_type
    CHECK (gateway_type IN ('STRIPE','RAZORPAY','PAYU','CASHFREE','MANUAL','CUSTOM'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gateway_definitions_type
  ON gateway_definitions (gateway_type);

-- ── 12. gateway_credentials ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gateway_credentials (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID,
  gateway_definition_id UUID        NOT NULL,
  scope                 VARCHAR(32) NOT NULL,
  public_config         JSONB       NOT NULL DEFAULT '{}',
  secret_config_encrypted TEXT,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by_id         UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_gateway_credential_scope
    CHECK (scope IN ('PLATFORM','TENANT'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gateway_credentials_tenant_gateway
  ON gateway_credentials (tenant_id, gateway_definition_id);

-- ── 13. feature_flags ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feature_flags (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID,
  key                 VARCHAR(128) NOT NULL,
  status              VARCHAR(32)  NOT NULL DEFAULT 'DISABLED',
  rollout_percentage  INT          NOT NULL DEFAULT 0,
  description         TEXT,
  metadata            JSONB        NOT NULL DEFAULT '{}',
  updated_by_id       UUID,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_feature_flag_status
    CHECK (status IN ('ENABLED','DISABLED','GRADUAL')),
  CONSTRAINT chk_rollout_percentage
    CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flags_tenant_key
  ON feature_flags (tenant_id, key);

-- ── 14. commercial_audit ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS commercial_audit (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID,
  action       VARCHAR(64)  NOT NULL,
  target_type  VARCHAR(64)  NOT NULL,
  target_id    UUID         NOT NULL,
  before_state JSONB,
  after_state  JSONB,
  actor_id     UUID,
  actor_role   VARCHAR(64),
  ip_address   VARCHAR(64),
  metadata     JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_audit_tenant_created
  ON commercial_audit (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_commercial_audit_tenant_action
  ON commercial_audit (tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_commercial_audit_target
  ON commercial_audit (tenant_id, target_id);
