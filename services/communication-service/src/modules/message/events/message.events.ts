/**
 * MessageEvents — domain event constants for the message domain.
 * All events namespaced under spancle.message.*
 */
export enum MessageEvents {
  CREATED = 'spancle.message.created',
  UPDATED = 'spancle.message.updated',
  DELETED = 'spancle.message.deleted',
  STATUS_CHANGED = 'spancle.message.status_changed',
}

export interface MessageEventPayload {
  tenantId: string;
  messageId: string;
  actorId?: string;
  timestamp?: string;
}

export interface MessageStatusChangedPayload extends MessageEventPayload {
  previousStatus: string;
  newStatus: string;
}
