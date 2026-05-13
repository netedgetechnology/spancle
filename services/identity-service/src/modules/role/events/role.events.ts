/**
 * RoleEvents — domain event constants for the role domain.
 * All events namespaced under spancle.role.*
 */
export enum RoleEvents {
  CREATED = 'spancle.role.created',
  UPDATED = 'spancle.role.updated',
  DELETED = 'spancle.role.deleted',
  STATUS_CHANGED = 'spancle.role.status_changed',
}

export interface RoleEventPayload {
  tenantId: string;
  roleId: string;
  actorId?: string;
  timestamp?: string;
}

export interface RoleStatusChangedPayload extends RoleEventPayload {
  previousStatus: string;
  newStatus: string;
}
