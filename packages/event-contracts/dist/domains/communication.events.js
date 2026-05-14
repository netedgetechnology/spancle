"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMMUNICATION_EVENT_SCHEMAS = exports.NotificationFailedPayloadSchema = exports.NotificationSentPayloadSchema = exports.NotificationQueuedPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
exports.NotificationQueuedPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    notificationId: zod_1.z.string().uuid(),
    recipientId: zod_1.z.string().uuid(),
    channel: zod_1.z.enum(['email', 'sms', 'push', 'in_app']),
    subject: zod_1.z.string().optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
    priority: zod_1.z.enum(['low', 'normal', 'high']).default('normal'),
});
exports.NotificationSentPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    notificationId: zod_1.z.string().uuid(),
    recipientId: zod_1.z.string().uuid(),
    channel: zod_1.z.string(),
    sentAt: zod_1.z.string().datetime(),
    externalRef: zod_1.z.string().optional(),
});
exports.NotificationFailedPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    notificationId: zod_1.z.string().uuid(),
    recipientId: zod_1.z.string().uuid(),
    channel: zod_1.z.string(),
    reason: zod_1.z.string(),
    retryCount: zod_1.z.number().int().min(0),
    retryable: zod_1.z.boolean(),
});
exports.COMMUNICATION_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.NOTIFICATION_QUEUED]: exports.NotificationQueuedPayloadSchema,
    [event_registry_1.EventRegistry.NOTIFICATION_SENT]: exports.NotificationSentPayloadSchema,
    [event_registry_1.EventRegistry.NOTIFICATION_FAILED]: exports.NotificationFailedPayloadSchema,
};
//# sourceMappingURL=communication.events.js.map