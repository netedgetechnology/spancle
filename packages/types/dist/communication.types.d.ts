import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';
export declare const NotificationChannelSchema: z.ZodEnum<["email", "sms", "push", "in_app"]>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export declare const NotificationStatusSchema: z.ZodEnum<["pending", "sent", "delivered", "failed", "bounced"]>;
export type NotificationStatus = z.infer<typeof NotificationStatusSchema>;
export declare const TemplateTypeSchema: z.ZodEnum<["email", "sms", "push"]>;
export type TemplateType = z.infer<typeof TemplateTypeSchema>;
export declare const CreateNotificationSchema: z.ZodObject<{
    recipientId: z.ZodString;
    channel: z.ZodEnum<["email", "sms", "push", "in_app"]>;
    templateId: z.ZodOptional<z.ZodString>;
    subject: z.ZodOptional<z.ZodString>;
    body: z.ZodString;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    scheduledAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    recipientId: string;
    channel: "push" | "email" | "sms" | "in_app";
    body: string;
    templateId?: string | undefined;
    subject?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    scheduledAt?: string | undefined;
}, {
    recipientId: string;
    channel: "push" | "email" | "sms" | "in_app";
    body: string;
    templateId?: string | undefined;
    subject?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    scheduledAt?: string | undefined;
}>;
export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
export declare const CreateTemplateSchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<["email", "sms", "push"]>;
    subject: z.ZodOptional<z.ZodString>;
    body: z.ZodString;
    variables: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    type: "push" | "email" | "sms";
    body: string;
    subject?: string | undefined;
    variables?: string[] | undefined;
}, {
    name: string;
    type: "push" | "email" | "sms";
    body: string;
    subject?: string | undefined;
    variables?: string[] | undefined;
}>;
export type CreateTemplateDto = z.infer<typeof CreateTemplateSchema>;
export interface Notification extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    recipientId: UUID;
    channel: NotificationChannel;
    subject?: string;
    body: string;
    status: NotificationStatus;
    sentAt?: Date;
    failedAt?: Date;
    failureReason?: string;
    isDeleted: boolean;
}
//# sourceMappingURL=communication.types.d.ts.map