"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('reporting');
/**
 * ReportingClient — typed client for reporting-service.
 *
 * Covers: report generation, dashboard metrics, data exports.
 * Report generation is async — poll getReportById until status = 'completed'.
 */
exports.ReportingClient = {
    // ── Reports ───────────────────────────────────────────────────────────────
    /**
     * Requests a new report. Returns immediately — report is generated async.
     * Poll getReportById() to check for status = 'completed' and retrieve fileUrl.
     */
    async requestReport(dto, ctx) {
        return http.post('/reports', dto, ctx);
    },
    async getReportById(reportId, ctx) {
        return http.get(`/reports/${reportId}`, ctx);
    },
    async listReports(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/reports${query ? `?${query}` : ''}`, ctx);
    },
    async deleteReport(reportId, ctx) {
        return http.delete(`/reports/${reportId}`, ctx);
    },
    // ── Dashboard Metrics ─────────────────────────────────────────────────────
    async getDashboardMetrics(params, ctx) {
        const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/dashboard/metrics?${query}`, ctx);
    },
    async getBookingSummary(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)).toString();
        return http.get(`/dashboard/bookings-summary?${query}`, ctx);
    },
    async getRevenueSummary(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)).toString();
        return http.get(`/dashboard/revenue?${query}`, ctx);
    },
    async getPlayerActivitySummary(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)).toString();
        return http.get(`/dashboard/player-activity?${query}`, ctx);
    },
};
//# sourceMappingURL=reporting.client.js.map