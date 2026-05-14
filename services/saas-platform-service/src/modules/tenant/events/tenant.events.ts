/**
 * TenantEvents — domain event constants for the tenant domain.
 * All events namespaced under spancle.tenant.*
 */
export enum TenantEvents {
  CREATED = 'spancle.tenant.created',
  UPDATED = 'spancle.tenant.updated',
  DELETED = 'spancle.tenant.deleted',
  STATUS_CHANGED = 'spancle.tenant.status_changed',
}

export interface TenantEventPayload {
  tenantId:   string;
  actorId?:   string;
  timestamp?: string;
}

export interface TenantStatusChangedPayload extends TenantEventPayload {
  previousStatus: string;
  newStatus:      string;
}
