/**
 * PlayerEvents — domain event constants for the player domain.
 * All events namespaced under spancle.player.*
 */
export enum PlayerEvents {
  CREATED = 'spancle.player.created',
  UPDATED = 'spancle.player.updated',
  DELETED = 'spancle.player.deleted',
  STATUS_CHANGED = 'spancle.player.status_changed',
}

export interface PlayerEventPayload {
  tenantId: string;
  playerId: string;
  actorId?: string;
  timestamp?: string;
}

export interface PlayerStatusChangedPayload extends PlayerEventPayload {
  previousStatus: string;
  newStatus: string;
}
