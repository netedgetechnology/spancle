import type {
  Report,
  CreateReportDto,
  DashboardMetric,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient, type HttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('reporting');

/**
 * ReportingClient — typed client for reporting-service.
 *
 * Covers: report generation, dashboard metrics, data exports.
 * Report generation is async — poll getReportById until status = 'completed'.
 */
export const ReportingClient = {

  // ── Reports ───────────────────────────────────────────────────────────────

  /**
   * Requests a new report. Returns immediately — report is generated async.
   * Poll getReportById() to check for status = 'completed' and retrieve fileUrl.
   */
  async requestReport(dto: CreateReportDto, ctx: RequestContext): Promise<Report> {
    return http.post<Report>('/reports', dto, ctx);
  },

  async getReportById(reportId: string, ctx: RequestContext): Promise<Report> {
    return http.get<Report>(`/reports/${reportId}`, ctx);
  },

  async listReports(
    params: {
      page?: number;
      limit?: number;
      type?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Report>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<PaginatedResult<Report>>(
      `/reports${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async deleteReport(reportId: string, ctx: RequestContext): Promise<void> {
    return http.delete<void>(`/reports/${reportId}`, ctx);
  },

  // ── Dashboard Metrics ─────────────────────────────────────────────────────

  async getDashboardMetrics(
    params: { period: 'day' | 'week' | 'month' | 'year'; dateFrom?: string; dateTo?: string },
    ctx: RequestContext,
  ): Promise<DashboardMetric[]> {
    const query = new URLSearchParams(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<DashboardMetric[]>(`/dashboard/metrics?${query}`, ctx);
  },

  async getBookingSummary(
    params: { dateFrom: string; dateTo: string },
    ctx: RequestContext,
  ): Promise<{
    total: number;
    confirmed: number;
    cancelled: number;
    revenue: { amount: number; currency: string };
  }> {
    const query = new URLSearchParams(Object.entries(params)).toString();
    return http.get(`/dashboard/bookings-summary?${query}`, ctx);
  },

  async getRevenueSummary(
    params: { dateFrom: string; dateTo: string; groupBy: 'day' | 'week' | 'month' },
    ctx: RequestContext,
  ): Promise<Array<{ period: string; amount: number; currency: string }>> {
    const query = new URLSearchParams(Object.entries(params)).toString();
    return http.get(`/dashboard/revenue?${query}`, ctx);
  },

  async getPlayerActivitySummary(
    params: { dateFrom: string; dateTo: string },
    ctx: RequestContext,
  ): Promise<{
    active: number;
    new: number;
    suspended: number;
    byLevel: Record<string, number>;
  }> {
    const query = new URLSearchParams(Object.entries(params)).toString();
    return http.get(`/dashboard/player-activity?${query}`, ctx);
  },
};
