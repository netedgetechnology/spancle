/**
 * MembershipEvents — domain event constants for the membership engine.
 * All events follow the existing spancle.domain.action convention.
 * Emitted by MembershipPlanService and MembershipService only.
 */
export enum MembershipEvents {
  // Lifecycle
  ENROLLED              = 'spancle.membership.enrolled',
  ACTIVATED             = 'spancle.membership.activated',
  FROZEN                = 'spancle.membership.frozen',
  UNFROZEN              = 'spancle.membership.unfrozen',
  RENEWED               = 'spancle.membership.renewed',
  RENEWAL_INVOICE_REQUESTED = 'spancle.membership.renewal_invoice_requested',
  PAYMENT_RECEIVED      = 'spancle.membership.payment_received',
  PAYMENT_FAILED        = 'spancle.membership.payment_failed',
  GRACE_PERIOD_STARTED  = 'spancle.membership.grace_period_started',
  EXPIRED               = 'spancle.membership.expired',
  CANCELLATION_SCHEDULED = 'spancle.membership.cancellation_scheduled',
  CANCELLED             = 'spancle.membership.cancelled',
  UPGRADED              = 'spancle.membership.upgraded',
  DOWNGRADE_SCHEDULED   = 'spancle.membership.downgrade_scheduled',
  DOWNGRADED            = 'spancle.membership.downgraded',
  SUSPENDED             = 'spancle.membership.suspended',
  RESTORED              = 'spancle.membership.restored',
  STATUS_CHANGED        = 'spancle.membership.status_changed',

  // Entitlement
  ENTITLEMENT_CONSUMED  = 'spancle.membership.entitlement_consumed',
  ENTITLEMENT_REFUNDED  = 'spancle.membership.entitlement_refunded',
  ENTITLEMENT_ADJUSTED  = 'spancle.membership.entitlement_adjusted',
  ENTITLEMENT_RESERVED  = 'spancle.membership.entitlement_reserved',
  ENTITLEMENT_RELEASED  = 'spancle.membership.entitlement_released',
  ENTITLEMENT_EXHAUSTED = 'spancle.membership.entitlement_exhausted',
  ENTITLEMENT_BALANCE_RESET = 'spancle.membership.entitlement_balance_reset',

  // Plan management
  PLAN_CREATED  = 'spancle.membership.plan_created',
  PLAN_UPDATED  = 'spancle.membership.plan_updated',
  PLAN_ARCHIVED = 'spancle.membership.plan_archived',
}

// ── Payload interfaces ────────────────────────────────────────────────────────

export interface MembershipEventPayload {
  tenantId:     string;
  membershipId: string;
  userId?:      string | null;
  actorId?:     string;
  timestamp:    string;
}

export interface MembershipStatusChangedPayload extends MembershipEventPayload {
  previousStatus: string;
  newStatus:      string;
}

export interface MembershipPlanEventPayload {
  tenantId:  string;
  planId:    string;
  actorId?:  string;
  timestamp: string;
}

export interface EntitlementConsumedPayload extends MembershipEventPayload {
  benefitType:    string;
  quantityDelta:  number;
  balanceAfter:   number;
  referenceType?: string;
  referenceId?:   string;
}
