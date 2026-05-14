import { z } from 'zod';
export declare const NotificationQueuedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    notificationId: z.ZodString;
    recipientId: z.ZodString;
    channel: z.ZodEnum<["email", "sms", "push", "in_app"]>;
    subject: z.ZodOptional<z.ZodString>;
    scheduledAt: z.ZodOptional<z.ZodString>;
    priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high"]>>;
}, "strip", z.ZodTypeAny, {
    channel: "push" | "email" | "sms" | "in_app";
    tenantId: string;
    notificationId: string;
    recipientId: string;
    priority: "low" | "normal" | "high";
    subject?: string | undefined;
    scheduledAt?: string | undefined;
}, {
    channel: "push" | "email" | "sms" | "in_app";
    tenantId: string;
    notificationId: string;
    recipientId: string;
    subject?: string | undefined;
    scheduledAt?: string | undefined;
    priority?: "low" | "normal" | "high" | undefined;
}>;
export declare const NotificationSentPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    notificationId: z.ZodString;
    recipientId: z.ZodString;
    channel: z.ZodString;
    sentAt: z.ZodString;
    externalRef: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    channel: string;
    tenantId: string;
    notificationId: string;
    recipientId: string;
    sentAt: string;
    externalRef?: string | undefined;
}, {
    channel: string;
    tenantId: string;
    notificationId: string;
    recipientId: string;
    sentAt: string;
    externalRef?: string | undefined;
}>;
export declare const NotificationFailedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    notificationId: z.ZodString;
    recipientId: z.ZodString;
    channel: z.ZodString;
    reason: z.ZodString;
    retryCount: z.ZodNumber;
    retryable: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    channel: string;
    tenantId: string;
    reason: string;
    retryable: boolean;
    notificationId: string;
    recipientId: string;
    retryCount: number;
}, {
    channel: string;
    tenantId: string;
    reason: string;
    retryable: boolean;
    notificationId: string;
    recipientId: string;
    retryCount: number;
}>;
export type NotificationQueuedPayload = z.infer<typeof NotificationQueuedPayloadSchema>;
export type NotificationSentPayload = z.infer<typeof NotificationSentPayloadSchema>;
export type NotificationFailedPayload = z.infer<typeof NotificationFailedPayloadSchema>;
export declare const COMMUNICATION_EVENT_SCHEMAS: {
    readonly "spancle.notification.queued": z.ZodObject<{
        tenantId: z.ZodString;
        notificationId: z.ZodString;
        recipientId: z.ZodString;
        channel: z.ZodEnum<["email", "sms", "push", "in_app"]>;
        subject: z.ZodOptional<z.ZodString>;
        scheduledAt: z.ZodOptional<z.ZodString>;
        priority: z.ZodDefault<z.ZodEnum<["low", "normal", "high"]>>;
    }, "strip", z.ZodTypeAny, {
        channel: "push" | "email" | "sms" | "in_app";
        tenantId: string;
        notificationId: string;
        recipientId: string;
        priority: "low" | "normal" | "high";
        subject?: string | undefined;
        scheduledAt?: string | undefined;
    }, {
        channel: "push" | "email" | "sms" | "in_app";
        tenantId: string;
        notificationId: string;
        recipientId: string;
        subject?: string | undefined;
        scheduledAt?: string | undefined;
        priority?: "low" | "normal" | "high" | undefined;
    }>;
    readonly "spancle.notification.sent": z.ZodObject<{
        tenantId: z.ZodString;
        notificationId: z.ZodString;
        recipientId: z.ZodString;
        channel: z.ZodString;
        sentAt: z.ZodString;
        externalRef: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        channel: string;
        tenantId: string;
        notificationId: string;
        recipientId: string;
        sentAt: string;
        externalRef?: string | undefined;
    }, {
        channel: string;
        tenantId: string;
        notificationId: string;
        recipientId: string;
        sentAt: string;
        externalRef?: string | undefined;
    }>;
    readonly "spancle.notification.failed": z.ZodObject<{
        tenantId: z.ZodString;
        notificationId: z.ZodString;
        recipientId: z.ZodString;
        channel: z.ZodString;
        reason: z.ZodString;
        retryCount: z.ZodNumber;
        retryable: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        channel: string;
        tenantId: string;
        reason: string;
        retryable: boolean;
        notificationId: string;
        recipientId: string;
        retryCount: number;
    }, {
        channel: string;
        tenantId: string;
        reason: string;
        retryable: boolean;
        notificationId: string;
        recipientId: string;
        retryCount: number;
    }>;
};
//# sourceMappingURL=communication.events.d.ts.map