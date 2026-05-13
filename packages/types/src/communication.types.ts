import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';

export const NotificationChannelSchema = z.enum([
  'email', 'sms', 'push', 'in_app',
]);
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;

export const NotificationStatusSchema = z.enum([
  'pending', 'sent', 'delivered', 'failed', 'bounced',
]);
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

export const TemplateTypeSchema = z.enum([
  'email', 'sms', 'push',
]);
export type TemplateType = z.infer<typeof TemplateTypeSchema>;

export const CreateNotificationSchema = z.object({
  recipientId: z.string().uuid(),
  channel:     NotificationChannelSchema,
  templateId:  z.string().uuid().optional(),
  subject:     z.string().max(200).optional(),
  body:        z.string().max(10_000),
  metadata:    z.record(z.string(), z.unknown()).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;

export const CreateTemplateSchema = z.object({
  name:    z.string().min(1).max(100),
  type:    TemplateTypeSchema,
  subject: z.string().max(200).optional(),
  body:    z.string().max(10_000),
  variables: z.array(z.string()).optional(),
});

export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;

export interface Notification extends AuditFields {
  id:          UUID;
  tenantId:    TenantId;
  recipientId: UUID;
  channel:     NotificationChannel;
  subject?:    string;
  body:        string;
  status:      NotificationStatus;
  sentAt?:     Date;
  failedAt?:   Date;
  failureReason?: string;
  isDeleted:   boolean;
}
