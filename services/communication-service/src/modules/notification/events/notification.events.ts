/**
 * NotificationEvents — domain event constants for the notification domain.
 * All events namespaced under spancle.notification.*
 */
export enum NotificationEvents {
  CREATED = 'spancle.notification.created',
  UPDATED = 'spancle.notification.updated',
  DELETED = 'spancle.notification.deleted',
  STATUS_CHANGED = 'spancle.notification.status_changed',
}

export interface NotificationEventPayload {
  tenantId: string;
  notificationId: string;
  actorId?: string;
  timestamp?: string;
}

export interface NotificationStatusChangedPayload extends NotificationEventPayload {
  previousStatus: string;
  newStatus: string;
}
