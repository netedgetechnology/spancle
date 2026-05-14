"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REPORTING_EVENT_SCHEMAS = exports.ReportFailedPayloadSchema = exports.ReportCompletedPayloadSchema = exports.ReportRequestedPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
exports.ReportRequestedPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    reportId: zod_1.z.string().uuid(),
    requestedBy: zod_1.z.string().uuid(),
    type: zod_1.z.string(),
    format: zod_1.z.string(),
    dateFrom: zod_1.z.string().date(),
    dateTo: zod_1.z.string().date(),
});
exports.ReportCompletedPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    reportId: zod_1.z.string().uuid(),
    fileUrl: zod_1.z.string().url(),
    fileSizeBytes: zod_1.z.number().int().positive(),
    generatedAt: zod_1.z.string().datetime(),
    durationMs: zod_1.z.number().int().positive(),
});
exports.ReportFailedPayloadSchema = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    reportId: zod_1.z.string().uuid(),
    reason: zod_1.z.string(),
    retryable: zod_1.z.boolean().default(false),
});
exports.REPORTING_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.REPORT_REQUESTED]: exports.ReportRequestedPayloadSchema,
    [event_registry_1.EventRegistry.REPORT_COMPLETED]: exports.ReportCompletedPayloadSchema,
    [event_registry_1.EventRegistry.REPORT_FAILED]: exports.ReportFailedPayloadSchema,
};
//# sourceMappingURL=reporting.events.js.map