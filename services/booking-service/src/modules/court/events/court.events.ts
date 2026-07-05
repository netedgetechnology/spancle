/**
 * CourtEvents — domain event constants for the court domain.
 * All events namespaced under spancle.court.*
 */
export enum CourtEvents {
  CREATED        = 'spancle.court.created',
  UPDATED        = 'spancle.court.updated',
  DELETED        = 'spancle.court.deleted',
  BOOKABILITY_CHANGED = 'spancle.court.bookability_changed',
}

export interface CourtEventPayload {
  tenantId: string;
  venueId:  string;
  courtId:  string;
  actorId?: string;
  timestamp?: string;
}

export interface CourtBookabilityChangedPayload extends CourtEventPayload {
  isBookable: boolean;
}
