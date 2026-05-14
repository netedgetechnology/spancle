import { z } from 'zod';
export declare const ReportRequestedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    reportId: z.ZodString;
    requestedBy: z.ZodString;
    type: z.ZodString;
    format: z.ZodString;
    dateFrom: z.ZodString;
    dateTo: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: string;
    tenantId: string;
    format: string;
    reportId: string;
    requestedBy: string;
    dateFrom: string;
    dateTo: string;
}, {
    type: string;
    tenantId: string;
    format: string;
    reportId: string;
    requestedBy: string;
    dateFrom: string;
    dateTo: string;
}>;
export declare const ReportCompletedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    reportId: z.ZodString;
    fileUrl: z.ZodString;
    fileSizeBytes: z.ZodNumber;
    generatedAt: z.ZodString;
    durationMs: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    reportId: string;
    fileUrl: string;
    fileSizeBytes: number;
    generatedAt: string;
    durationMs: number;
}, {
    tenantId: string;
    reportId: string;
    fileUrl: string;
    fileSizeBytes: number;
    generatedAt: string;
    durationMs: number;
}>;
export declare const ReportFailedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    reportId: z.ZodString;
    reason: z.ZodString;
    retryable: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    reason: string;
    retryable: boolean;
    reportId: string;
}, {
    tenantId: string;
    reason: string;
    reportId: string;
    retryable?: boolean | undefined;
}>;
export type ReportRequestedPayload = z.infer<typeof ReportRequestedPayloadSchema>;
export type ReportCompletedPayload = z.infer<typeof ReportCompletedPayloadSchema>;
export type ReportFailedPayload = z.infer<typeof ReportFailedPayloadSchema>;
export declare const REPORTING_EVENT_SCHEMAS: {
    readonly "spancle.report.requested": z.ZodObject<{
        tenantId: z.ZodString;
        reportId: z.ZodString;
        requestedBy: z.ZodString;
        type: z.ZodString;
        format: z.ZodString;
        dateFrom: z.ZodString;
        dateTo: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: string;
        tenantId: string;
        format: string;
        reportId: string;
        requestedBy: string;
        dateFrom: string;
        dateTo: string;
    }, {
        type: string;
        tenantId: string;
        format: string;
        reportId: string;
        requestedBy: string;
        dateFrom: string;
        dateTo: string;
    }>;
    readonly "spancle.report.completed": z.ZodObject<{
        tenantId: z.ZodString;
        reportId: z.ZodString;
        fileUrl: z.ZodString;
        fileSizeBytes: z.ZodNumber;
        generatedAt: z.ZodString;
        durationMs: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        reportId: string;
        fileUrl: string;
        fileSizeBytes: number;
        generatedAt: string;
        durationMs: number;
    }, {
        tenantId: string;
        reportId: string;
        fileUrl: string;
        fileSizeBytes: number;
        generatedAt: string;
        durationMs: number;
    }>;
    readonly "spancle.report.failed": z.ZodObject<{
        tenantId: z.ZodString;
        reportId: z.ZodString;
        reason: z.ZodString;
        retryable: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        reason: string;
        retryable: boolean;
        reportId: string;
    }, {
        tenantId: string;
        reason: string;
        reportId: string;
        retryable?: boolean | undefined;
    }>;
};
//# sourceMappingURL=reporting.events.d.ts.map