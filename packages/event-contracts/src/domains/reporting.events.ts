import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

export const ReportRequestedPayloadSchema = z.object({
  tenantId:  z.string().uuid(),
  reportId:  z.string().uuid(),
  requestedBy: z.string().uuid(),
  type:      z.string(),
  format:    z.string(),
  dateFrom:  z.string().date(),
  dateTo:    z.string().date(),
});

export const ReportCompletedPayloadSchema = z.object({
  tenantId:    z.string().uuid(),
  reportId:    z.string().uuid(),
  fileUrl:     z.string().url(),
  fileSizeBytes: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  durationMs:  z.number().int().positive(),
});

export const ReportFailedPayloadSchema = z.object({
  tenantId:  z.string().uuid(),
  reportId:  z.string().uuid(),
  reason:    z.string(),
  retryable: z.boolean().default(false),
});

export type ReportRequestedPayload = z.infer<typeof ReportRequestedPayloadSchema>;
export type ReportCompletedPayload = z.infer<typeof ReportCompletedPayloadSchema>;
export type ReportFailedPayload    = z.infer<typeof ReportFailedPayloadSchema>;

export const REPORTING_EVENT_SCHEMAS = {
  [EventRegistry.REPORT_REQUESTED]: ReportRequestedPayloadSchema,
  [EventRegistry.REPORT_COMPLETED]: ReportCompletedPayloadSchema,
  [EventRegistry.REPORT_FAILED]:    ReportFailedPayloadSchema,
} as const;
