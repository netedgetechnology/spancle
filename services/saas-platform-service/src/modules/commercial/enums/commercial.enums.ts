// ── CommercialRuleType ────────────────────────────────────────────────────────

export enum CommercialRuleType {
  PRICING       = 'PRICING',
  DISCOUNT      = 'DISCOUNT',
  ELIGIBILITY   = 'ELIGIBILITY',
  RESTRICTION   = 'RESTRICTION',
  DISTRIBUTION  = 'DISTRIBUTION',
}

// ── CommercialRuleStatus ──────────────────────────────────────────────────────

export enum CommercialRuleStatus {
  DRAFT     = 'DRAFT',
  ACTIVE    = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED  = 'ARCHIVED',
}

// ── PricingModelType ──────────────────────────────────────────────────────────

export enum PricingModelType {
  FLAT_RATE       = 'FLAT_RATE',
  PER_UNIT        = 'PER_UNIT',
  TIERED          = 'TIERED',
  VOLUME          = 'VOLUME',
  GRADUATED       = 'GRADUATED',
  PACKAGE         = 'PACKAGE',
  CUSTOM          = 'CUSTOM',
}

// ── PaymentOwnershipType ──────────────────────────────────────────────────────

export enum PaymentOwnershipType {
  PLATFORM       = 'PLATFORM',
  TENANT         = 'TENANT',
  SPLIT          = 'SPLIT',
}

// ── RevenueDistributionType ───────────────────────────────────────────────────

export enum RevenueDistributionType {
  FLAT_PERCENTAGE = 'FLAT_PERCENTAGE',
  TIERED          = 'TIERED',
  FIXED_AMOUNT    = 'FIXED_AMOUNT',
  NET_REVENUE     = 'NET_REVENUE',
}

// ── GatewayType ───────────────────────────────────────────────────────────────

export enum GatewayType {
  STRIPE    = 'STRIPE',
  RAZORPAY  = 'RAZORPAY',
  PAYU      = 'PAYU',
  CASHFREE  = 'CASHFREE',
  MANUAL    = 'MANUAL',
  CUSTOM    = 'CUSTOM',
}

// ── GatewayScope ─────────────────────────────────────────────────────────────

export enum GatewayScope {
  PLATFORM = 'PLATFORM',
  TENANT   = 'TENANT',
}

// ── CommercialProductType ─────────────────────────────────────────────────────

export enum CommercialProductType {
  SUBSCRIPTION  = 'SUBSCRIPTION',
  ONE_TIME      = 'ONE_TIME',
  USAGE_BASED   = 'USAGE_BASED',
  ADDON         = 'ADDON',
}

// ── CommercialDecisionOutcome ─────────────────────────────────────────────────

export enum CommercialDecisionOutcome {
  ALLOWED   = 'ALLOWED',
  DENIED    = 'DENIED',
  MODIFIED  = 'MODIFIED',
  PENDING   = 'PENDING',
}

// ── FeatureFlagStatus ─────────────────────────────────────────────────────────

export enum FeatureFlagStatus {
  ENABLED   = 'ENABLED',
  DISABLED  = 'DISABLED',
  GRADUAL   = 'GRADUAL',
}

// ── CommercialAuditAction ─────────────────────────────────────────────────────

export enum CommercialAuditAction {
  RULE_CREATED    = 'RULE_CREATED',
  RULE_UPDATED    = 'RULE_UPDATED',
  RULE_ARCHIVED   = 'RULE_ARCHIVED',
  VERSION_CREATED = 'VERSION_CREATED',
  DECISION_MADE   = 'DECISION_MADE',
  FLAG_TOGGLED    = 'FLAG_TOGGLED',
  CREDENTIAL_SET  = 'CREDENTIAL_SET',
}

// ── TransactionType ───────────────────────────────────────────────────────────

export enum TransactionType {
  BOOKING         = 'BOOKING',
  SUBSCRIPTION    = 'SUBSCRIPTION',
  ADDON_PURCHASE  = 'ADDON_PURCHASE',
  REFUND          = 'REFUND',
  CHARGEBACK      = 'CHARGEBACK',
  ADJUSTMENT      = 'ADJUSTMENT',
}

// ── CommercialPipelineStep ────────────────────────────────────────────────────

export enum CommercialPipelineStep {
  VALIDATE_REQUEST   = 'VALIDATE_REQUEST',
  RESOLVE_PACKAGE    = 'RESOLVE_PACKAGE',
  RESOLVE_PRODUCT    = 'RESOLVE_PRODUCT',
  RESOLVE_POLICIES   = 'RESOLVE_POLICIES',
  GENERATE_SNAPSHOT  = 'GENERATE_SNAPSHOT',
}
