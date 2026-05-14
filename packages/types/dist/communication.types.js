"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateTemplateSchema = exports.CreateNotificationSchema = exports.TemplateTypeSchema = exports.NotificationStatusSchema = exports.NotificationChannelSchema = void 0;
const zod_1 = require("zod");
exports.NotificationChannelSchema = zod_1.z.enum([
    'email', 'sms', 'push', 'in_app',
]);
exports.NotificationStatusSchema = zod_1.z.enum([
    'pending', 'sent', 'delivered', 'failed', 'bounced',
]);
exports.TemplateTypeSchema = zod_1.z.enum([
    'email', 'sms', 'push',
]);
exports.CreateNotificationSchema = zod_1.z.object({
    recipientId: zod_1.z.string().uuid(),
    channel: exports.NotificationChannelSchema,
    templateId: zod_1.z.string().uuid().optional(),
    subject: zod_1.z.string().max(200).optional(),
    body: zod_1.z.string().max(10_000),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    scheduledAt: zod_1.z.string().datetime().optional(),
});
exports.CreateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    type: exports.TemplateTypeSchema,
    subject: zod_1.z.string().max(200).optional(),
    body: zod_1.z.string().max(10_000),
    variables: zod_1.z.array(zod_1.z.string()).optional(),
});
//# sourceMappingURL=communication.types.js.map