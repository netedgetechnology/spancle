/**
 * MetricEvents — domain event constants for the metric domain.
 * All events namespaced under spancle.metric.*
 */
export enum MetricEvents {
  CREATED = 'spancle.metric.created',
  UPDATED = 'spancle.metric.updated',
  DELETED = 'spancle.metric.deleted',
  STATUS_CHANGED = 'spancle.metric.status_changed',
}

export interface MetricEventPayload {
  tenantId: string;
  metricId: string;
  actorId?: string;
  timestamp?: string;
}

export interface MetricStatusChangedPayload extends MetricEventPayload {
  previousStatus: string;
  newStatus: string;
}
