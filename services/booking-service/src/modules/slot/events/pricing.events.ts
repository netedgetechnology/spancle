/**
 * PricingEvents — domain event constants for price calculation.
 * All events namespaced under spancle.pricing.*
 *
 * Consumed by: audit service, analytics, notification triggers.
 * Emitted by:  PricingService only.
 */
export enum PricingEvents {
  PRICE_CALCULATED = 'spancle.pricing.calculated',
  RULE_APPLIED     = 'spancle.pricing.rule_applied',
  COUPON_ACCEPTED  = 'spancle.pricing.coupon_accepted',
  COUPON_REJECTED  = 'spancle.pricing.coupon_rejected',
}

// ── Payload interfaces ────────────────────────────────────────────────────────

export interface PriceCalculatedPayload {
  tenantId:           string;
  courtId:            string;
  branchId:           string;
  slotIds?:           string[];
  resolvedPriceMinor: number | null;
  appliedRuleIds:     string[];
  /** Context that triggered the calculation: slot_generation | booking | quote */
  context:            'slot_generation' | 'booking' | 'quote';
  timestamp:          string;
}

export interface RuleAppliedPayload {
  tenantId:   string;
  ruleId:     string;
  ruleName:   string;
  ruleType:   string;
  priceAfter: number;
  context?:   string;
  timestamp:  string;
}

export interface CouponAcceptedPayload {
  tenantId:     string;
  couponCode:   string;
  ruleId:       string;
  discountMinor: number;
  bookingId?:   string;
  actorId?:     string;
  timestamp:    string;
}

export interface CouponRejectedPayload {
  tenantId:   string;
  couponCode: string;
  reason:     'not_found' | 'inactive' | 'expired' | 'exhausted' | 'scope_mismatch';
  bookingId?: string;
  actorId?:   string;
  timestamp:  string;
}
