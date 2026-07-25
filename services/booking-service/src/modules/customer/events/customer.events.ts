export enum CustomerEvents {
  CREATED = 'spancle.customer.created',
  UPDATED = 'spancle.customer.updated',
  DELETED = 'spancle.customer.deleted',
  STATUS_CHANGED = 'spancle.customer.status_changed',
}

export interface CustomerEventPayload {
  tenantId:   string;
  customerId: string;
  actorId?:   string;
  timestamp:  string;
}

export interface CustomerStatusChangedPayload extends CustomerEventPayload {
  previousStatus: string;
  newStatus:      string;
}
