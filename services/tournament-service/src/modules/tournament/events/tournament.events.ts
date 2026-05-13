/**
 * TournamentEvents — domain event constants for the tournament domain.
 * All events namespaced under spancle.tournament.*
 */
export enum TournamentEvents {
  CREATED = 'spancle.tournament.created',
  UPDATED = 'spancle.tournament.updated',
  DELETED = 'spancle.tournament.deleted',
  STATUS_CHANGED = 'spancle.tournament.status_changed',
}

export interface TournamentEventPayload {
  tenantId: string;
  tournamentId: string;
  actorId?: string;
  timestamp?: string;
}

export interface TournamentStatusChangedPayload extends TournamentEventPayload {
  previousStatus: string;
  newStatus: string;
}
