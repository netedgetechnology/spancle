import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';

export const ReportTypeSchema = z.enum([
  'bookings_summary', 'revenue', 'player_activity',
  'tournament_results', 'attendance', 'custom',
]);
export type ReportType = z.infer<typeof ReportTypeSchema>;

export const ReportStatusSchema = z.enum([
  'pending', 'processing', 'completed', 'failed',
]);
export type ReportStatus = z.infer<typeof ReportStatusSchema>;

export const ReportFormatSchema = z.enum(['json', 'csv', 'pdf', 'xlsx']);
export type ReportFormat = z.infer<typeof ReportFormatSchema>;

export const CreateReportSchema = z.object({
  type:     ReportTypeSchema,
  format:   ReportFormatSchema.default('json'),
  filters:  z.record(z.string(), z.unknown()).optional(),
  dateFrom: z.string().date(),
  dateTo:   z.string().date(),
  name:     z.string().max(200).optional(),
});

export type CreateReportDto = z.infer<typeof CreateReportSchema>;

export interface Report extends AuditFields {
  id:         UUID;
  tenantId:   TenantId;
  type:       ReportType;
  status:     ReportStatus;
  format:     ReportFormat;
  filters?:   Record<string, unknown>;
  dateFrom:   Date;
  dateTo:     Date;
  name?:      string;
  fileUrl?:   string;
  error?:     string;
  isDeleted:  boolean;
}

export interface DashboardMetric {
  key:       string;
  label:     string;
  value:     number | string;
  delta?:    number;
  unit?:     string;
  trend?:    'up' | 'down' | 'flat';
  period:    string;
}
