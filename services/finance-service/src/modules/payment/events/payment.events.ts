/**
 * PaymentEvents — domain event constants for the payment domain.
 * All events namespaced under spancle.payment.*
 */
export enum PaymentEvents {
  CREATED = 'spancle.payment.created',
  UPDATED = 'spancle.payment.updated',
  DELETED = 'spancle.payment.deleted',
  STATUS_CHANGED = 'spancle.payment.status_changed',
}

export interface PaymentEventPayload {
  tenantId: string;
  paymentId: string;
  actorId?: string;
  timestamp?: string;
}

export interface PaymentStatusChangedPayload extends PaymentEventPayload {
  previousStatus: string;
  newStatus: string;
}
