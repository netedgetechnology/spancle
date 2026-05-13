/**
 * ReportEvents — domain event constants for the report domain.
 * All events namespaced under spancle.report.*
 */
export enum ReportEvents {
  CREATED = 'spancle.report.created',
  UPDATED = 'spancle.report.updated',
  DELETED = 'spancle.report.deleted',
  STATUS_CHANGED = 'spancle.report.status_changed',
}

export interface ReportEventPayload {
  tenantId: string;
  reportId: string;
  actorId?: string;
  timestamp?: string;
}

export interface ReportStatusChangedPayload extends ReportEventPayload {
  previousStatus: string;
  newStatus: string;
}
