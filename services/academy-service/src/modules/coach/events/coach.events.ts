/**
 * CoachEvents — domain event constants for the coach domain.
 * All events namespaced under spancle.coach.*
 */
export enum CoachEvents {
  CREATED = 'spancle.coach.created',
  UPDATED = 'spancle.coach.updated',
  DELETED = 'spancle.coach.deleted',
  STATUS_CHANGED = 'spancle.coach.status_changed',
}

export interface CoachEventPayload {
  tenantId: string;
  coachId: string;
  actorId?: string;
  timestamp?: string;
}

export interface CoachStatusChangedPayload extends CoachEventPayload {
  previousStatus: string;
  newStatus: string;
}
