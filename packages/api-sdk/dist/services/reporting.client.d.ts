import type { Report, CreateReportDto, DashboardMetric, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * ReportingClient — typed client for reporting-service.
 *
 * Covers: report generation, dashboard metrics, data exports.
 * Report generation is async — poll getReportById until status = 'completed'.
 */
export declare const ReportingClient: {
    /**
     * Requests a new report. Returns immediately — report is generated async.
     * Poll getReportById() to check for status = 'completed' and retrieve fileUrl.
     */
    requestReport(dto: CreateReportDto, ctx: RequestContext): Promise<Report>;
    getReportById(reportId: string, ctx: RequestContext): Promise<Report>;
    listReports(params: {
        page?: number;
        limit?: number;
        type?: string;
        status?: string;
        dateFrom?: string;
        dateTo?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Report>>;
    deleteReport(reportId: string, ctx: RequestContext): Promise<void>;
    getDashboardMetrics(params: {
        period: "day" | "week" | "month" | "year";
        dateFrom?: string;
        dateTo?: string;
    }, ctx: RequestContext): Promise<DashboardMetric[]>;
    getBookingSummary(params: {
        dateFrom: string;
        dateTo: string;
    }, ctx: RequestContext): Promise<{
        total: number;
        confirmed: number;
        cancelled: number;
        revenue: {
            amount: number;
            currency: string;
        };
    }>;
    getRevenueSummary(params: {
        dateFrom: string;
        dateTo: string;
        groupBy: "day" | "week" | "month";
    }, ctx: RequestContext): Promise<Array<{
        period: string;
        amount: number;
        currency: string;
    }>>;
    getPlayerActivitySummary(params: {
        dateFrom: string;
        dateTo: string;
    }, ctx: RequestContext): Promise<{
        active: number;
        new: number;
        suspended: number;
        byLevel: Record<string, number>;
    }>;
};
//# sourceMappingURL=reporting.client.d.ts.map