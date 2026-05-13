/**
 * BracketEvents — domain event constants for the bracket domain.
 * All events namespaced under spancle.bracket.*
 */
export enum BracketEvents {
  CREATED = 'spancle.bracket.created',
  UPDATED = 'spancle.bracket.updated',
  DELETED = 'spancle.bracket.deleted',
  STATUS_CHANGED = 'spancle.bracket.status_changed',
}

export interface BracketEventPayload {
  tenantId: string;
  bracketId: string;
  actorId?: string;
  timestamp?: string;
}

export interface BracketStatusChangedPayload extends BracketEventPayload {
  previousStatus: string;
  newStatus: string;
}
