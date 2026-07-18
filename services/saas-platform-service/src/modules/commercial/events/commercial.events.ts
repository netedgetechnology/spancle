export enum CommercialEvents {
  RULE_CREATED              = 'spancle.commercial.rule.created',
  RULE_UPDATED              = 'spancle.commercial.rule.updated',
  RULE_ARCHIVED             = 'spancle.commercial.rule.archived',
  RULE_VERSION_CREATED      = 'spancle.commercial.rule_version.created',
  PACKAGE_DEFINITION_CREATED = 'spancle.commercial.package_definition.created',
  PACKAGE_VERSION_CREATED   = 'spancle.commercial.package_version.created',
  PRODUCT_CREATED           = 'spancle.commercial.product.created',
  PRICING_MODEL_CREATED     = 'spancle.commercial.pricing_model.created',
  FEATURE_FLAG_UPDATED      = 'spancle.commercial.feature_flag.updated',
  GATEWAY_CREDENTIAL_SET    = 'spancle.commercial.gateway_credential.set',
  // ── Decision lifecycle ───────────────────────────────────────────────────
  DECISION_REQUESTED        = 'spancle.commercial.decision.requested',
  DECISION_GENERATED        = 'spancle.commercial.decision.generated',
  DECISION_FAILED           = 'spancle.commercial.decision.failed',
  /** @deprecated Use DECISION_GENERATED — kept for event subscriber compatibility */
  DECISION_MADE             = 'spancle.commercial.decision.made',
  // ── Policy resolution ─────────────────────────────────────────────────
  POLICY_RESOLVED           = 'spancle.commercial.policy.resolved',
  POLICY_RESOLUTION_FAILED  = 'spancle.commercial.policy.resolution_failed',
  // ── Package resolution ───────────────────────────────────────────────────
  PACKAGE_RESOLVED          = 'spancle.commercial.package.resolved',
  PACKAGE_RESOLUTION_FAILED = 'spancle.commercial.package.resolution_failed',
  // ── Entitlement resolution ───────────────────────────────────────────────
  ENTITLEMENTS_RESOLVED      = 'spancle.commercial.entitlements.resolved',
  ENTITLEMENT_RESOLUTION_FAILED = 'spancle.commercial.entitlements.resolution_failed',
  // ── Rule resolution ───────────────────────────────────────────────────────
  RULES_RESOLVED             = 'spancle.commercial.rules.resolved',
  RULE_EVALUATION_FAILED     = 'spancle.commercial.rule.evaluation_failed',
  // ── Gateway registry ─────────────────────────────────────────────────────
  GATEWAY_SELECTED           = 'spancle.commercial.gateway.selected',
  GATEWAY_SELECTION_FAILED   = 'spancle.commercial.gateway.selection_failed',
}
