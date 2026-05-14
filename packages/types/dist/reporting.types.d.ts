import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';
export declare const ReportTypeSchema: z.ZodEnum<["bookings_summary", "revenue", "player_activity", "tournament_results", "attendance", "custom"]>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export declare const ReportStatusSchema: z.ZodEnum<["pending", "processing", "completed", "failed"]>;
export type ReportStatus = z.infer<typeof ReportStatusSchema>;
export declare const ReportFormatSchema: z.ZodEnum<["json", "csv", "pdf", "xlsx"]>;
export type ReportFormat = z.infer<typeof ReportFormatSchema>;
export declare const CreateReportSchema: z.ZodObject<{
    type: z.ZodEnum<["bookings_summary", "revenue", "player_activity", "tournament_results", "attendance", "custom"]>;
    format: z.ZodDefault<z.ZodEnum<["json", "csv", "pdf", "xlsx"]>>;
    filters: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    dateFrom: z.ZodString;
    dateTo: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "custom" | "bookings_summary" | "revenue" | "player_activity" | "tournament_results" | "attendance";
    format: "json" | "csv" | "pdf" | "xlsx";
    dateFrom: string;
    dateTo: string;
    name?: string | undefined;
    filters?: Record<string, unknown> | undefined;
}, {
    type: "custom" | "bookings_summary" | "revenue" | "player_activity" | "tournament_results" | "attendance";
    dateFrom: string;
    dateTo: string;
    name?: string | undefined;
    format?: "json" | "csv" | "pdf" | "xlsx" | undefined;
    filters?: Record<string, unknown> | undefined;
}>;
export type CreateReportDto = z.infer<typeof CreateReportSchema>;
export interface Report extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    type: ReportType;
    status: ReportStatus;
    format: ReportFormat;
    filters?: Record<string, unknown>;
    dateFrom: Date;
    dateTo: Date;
    name?: string;
    fileUrl?: string;
    error?: string;
    isDeleted: boolean;
}
export interface DashboardMetric {
    key: string;
    label: string;
    value: number | string;
    delta?: number;
    unit?: string;
    trend?: 'up' | 'down' | 'flat';
    period: string;
}
//# sourceMappingURL=reporting.types.d.ts.map