/**
 * MatchEvents — domain event constants for the match domain.
 * All events namespaced under spancle.match.*
 */
export enum MatchEvents {
  CREATED = 'spancle.match.created',
  UPDATED = 'spancle.match.updated',
  DELETED = 'spancle.match.deleted',
  STATUS_CHANGED = 'spancle.match.status_changed',
}

export interface MatchEventPayload {
  tenantId: string;
  matchId: string;
  actorId?: string;
  timestamp?: string;
}

export interface MatchStatusChangedPayload extends MatchEventPayload {
  previousStatus: string;
  newStatus: string;
}
