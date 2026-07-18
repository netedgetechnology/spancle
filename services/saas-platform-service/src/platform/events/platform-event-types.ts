/**
 * platform-event-types.ts
 *
 * Canonical, consumer-agnostic platform event type definitions for SPANCLE.
 *
 * These constants are the stable public identifiers for all platform events.
 * Consumers subscribe to these types; Commercial emits them.
 * Neither side knows about the other's transport, infrastructure, or domain models.
 *
 * Naming convention: SPANCLE_<DOMAIN>_<ENTITY>_<PAST_VERB>
 *
 * Version: 1.0.0
 *
 * Future consumers (Finance, CRM, Notifications, Analytics, Marketplace, AI)
 * add new subscriptions here without modifying Commercial itself.
 */

export const PlatformEventTypes = {
  // ── Commercial: Decision lifecycle ────────────────────────────────────────
  COMMERCIAL_DECISION_GENERATED:    'spancle.platform.commercial.decision.generated',
  COMMERCIAL_DECISION_REQUESTED:    'spancle.platform.commercial.decision.requested',
  COMMERCIAL_DECISION_FAILED:       'spancle.platform.commercial.decision.failed',

  // ── Commercial: Contract lifecycle ───────────────────────────────────────
  COMMERCIAL_CONTRACT_CREATED:      'spancle.platform.commercial.contract.created',
  COMMERCIAL_CONTRACT_PUBLISHED:    'spancle.platform.commercial.contract.published',
  COMMERCIAL_CONTRACT_FAILED:       'spancle.platform.commercial.contract.failed',

  // ── Commercial: Package ───────────────────────────────────────────────────
  COMMERCIAL_PACKAGE_RESOLVED:      'spancle.platform.commercial.package.resolved',
  COMMERCIAL_PACKAGE_RESOLUTION_FAILED: 'spancle.platform.commercial.package.resolution_failed',

  // ── Commercial: Policy ────────────────────────────────────────────────────
  COMMERCIAL_POLICY_RESOLVED:       'spancle.platform.commercial.policy.resolved',
  COMMERCIAL_POLICY_RESOLUTION_FAILED: 'spancle.platform.commercial.policy.resolution_failed',

  // ── Commercial: Entitlements ─────────────────────────────────────────────
  COMMERCIAL_ENTITLEMENTS_RESOLVED:  'spancle.platform.commercial.entitlements.resolved',
  COMMERCIAL_ENTITLEMENT_RESOLUTION_FAILED: 'spancle.platform.commercial.entitlements.resolution_failed',

  // ── Commercial: Rules ────────────────────────────────────────────────────
  COMMERCIAL_RULES_RESOLVED:        'spancle.platform.commercial.rules.resolved',
  COMMERCIAL_RULE_EVALUATION_FAILED: 'spancle.platform.commercial.rule.evaluation_failed',

  // ── Commercial: Gateway ──────────────────────────────────────────────────
  COMMERCIAL_GATEWAY_SELECTED:      'spancle.platform.commercial.gateway.selected',
  COMMERCIAL_GATEWAY_SELECTION_FAILED: 'spancle.platform.commercial.gateway.selection_failed',
} as const;

export type PlatformEventType = typeof PlatformEventTypes[keyof typeof PlatformEventTypes];
