/**
 * AcademyEvents — domain event constants for the academy domain.
 * All events namespaced under spancle.academy.*
 */
export enum AcademyEvents {
  CREATED = 'spancle.academy.created',
  UPDATED = 'spancle.academy.updated',
  DELETED = 'spancle.academy.deleted',
  STATUS_CHANGED = 'spancle.academy.status_changed',
}

export interface AcademyEventPayload {
  tenantId: string;
  academyId: string;
  actorId?: string;
  timestamp?: string;
}

export interface AcademyStatusChangedPayload extends AcademyEventPayload {
  previousStatus: string;
  newStatus: string;
}
