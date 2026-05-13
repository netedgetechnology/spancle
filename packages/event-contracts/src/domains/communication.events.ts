import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

export const NotificationQueuedPayloadSchema = z.object({
  tenantId:       z.string().uuid(),
  notificationId: z.string().uuid(),
  recipientId:    z.string().uuid(),
  channel:        z.enum(['email', 'sms', 'push', 'in_app']),
  subject:        z.string().optional(),
  scheduledAt:    z.string().datetime().optional(),
  priority:       z.enum(['low', 'normal', 'high']).default('normal'),
});

export const NotificationSentPayloadSchema = z.object({
  tenantId:       z.string().uuid(),
  notificationId: z.string().uuid(),
  recipientId:    z.string().uuid(),
  channel:        z.string(),
  sentAt:         z.string().datetime(),
  externalRef:    z.string().optional(),
});

export const NotificationFailedPayloadSchema = z.object({
  tenantId:       z.string().uuid(),
  notificationId: z.string().uuid(),
  recipientId:    z.string().uuid(),
  channel:        z.string(),
  reason:         z.string(),
  retryCount:     z.number().int().min(0),
  retryable:      z.boolean(),
});

export type NotificationQueuedPayload = z.infer<typeof NotificationQueuedPayloadSchema>;
export type NotificationSentPayload   = z.infer<typeof NotificationSentPayloadSchema>;
export type NotificationFailedPayload = z.infer<typeof NotificationFailedPayloadSchema>;

export const COMMUNICATION_EVENT_SCHEMAS = {
  [EventRegistry.NOTIFICATION_QUEUED]: NotificationQueuedPayloadSchema,
  [EventRegistry.NOTIFICATION_SENT]:   NotificationSentPayloadSchema,
  [EventRegistry.NOTIFICATION_FAILED]: NotificationFailedPayloadSchema,
} as const;
