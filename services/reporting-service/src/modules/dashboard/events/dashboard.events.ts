/**
 * DashboardEvents — domain event constants for the dashboard domain.
 * All events namespaced under spancle.dashboard.*
 */
export enum DashboardEvents {
  CREATED = 'spancle.dashboard.created',
  UPDATED = 'spancle.dashboard.updated',
  DELETED = 'spancle.dashboard.deleted',
  STATUS_CHANGED = 'spancle.dashboard.status_changed',
}

export interface DashboardEventPayload {
  tenantId: string;
  dashboardId: string;
  actorId?: string;
  timestamp?: string;
}

export interface DashboardStatusChangedPayload extends DashboardEventPayload {
  previousStatus: string;
  newStatus: string;
}
