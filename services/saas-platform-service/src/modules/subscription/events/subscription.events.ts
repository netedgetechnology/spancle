export enum SubscriptionEvents {
  CREATED         = 'spancle.subscription.created',
  TRIAL_STARTED   = 'spancle.subscription.trial_started',
  ACTIVATED       = 'spancle.subscription.activated',
  PAST_DUE        = 'spancle.subscription.past_due',
  CANCELLED       = 'spancle.subscription.cancelled',
  EXPIRED         = 'spancle.subscription.expired',
  PAUSED          = 'spancle.subscription.paused',
  RESUMED         = 'spancle.subscription.resumed',
  RENEWED         = 'spancle.subscription.renewed',
}

export interface SubscriptionEventPayload {
  tenantId:       string;
  subscriptionId: string;
  packageId:      string;
  tierKey:        string;
  actorId:        string;
  timestamp:      string;
}

export interface SubscriptionCancelledPayload extends SubscriptionEventPayload {
  reason: string;
}
