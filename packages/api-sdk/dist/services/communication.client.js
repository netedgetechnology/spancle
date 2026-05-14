"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('communication');
/**
 * CommunicationClient — typed client for communication-service.
 *
 * Covers: notifications, bulk messaging, template management.
 */
exports.CommunicationClient = {
    // ── Notifications ─────────────────────────────────────────────────────────
    async sendNotification(dto, ctx) {
        return http.post('/notifications', dto, ctx);
    },
    async sendBulkNotification(dto, ctx) {
        return http.post('/notifications/bulk', dto, ctx);
    },
    async getNotificationById(notificationId, ctx) {
        return http.get(`/notifications/${notificationId}`, ctx);
    },
    async listNotifications(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/notifications${query ? `?${query}` : ''}`, ctx);
    },
    async retryNotification(notificationId, ctx) {
        return http.post(`/notifications/${notificationId}/retry`, {}, ctx);
    },
    // ── Templates ─────────────────────────────────────────────────────────────
    async createTemplate(dto, ctx) {
        return http.post('/templates', dto, ctx);
    },
    async getTemplateById(templateId, ctx) {
        return http.get(`/templates/${templateId}`, ctx);
    },
    async listTemplates(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/templates${query ? `?${query}` : ''}`, ctx);
    },
    async updateTemplate(templateId, dto, ctx) {
        return http.patch(`/templates/${templateId}`, dto, ctx);
    },
    async deleteTemplate(templateId, ctx) {
        return http.delete(`/templates/${templateId}`, ctx);
    },
    // ── Preview ───────────────────────────────────────────────────────────────
    async previewTemplate(templateId, variables, ctx) {
        return http.post(`/templates/${templateId}/preview`, { variables }, ctx);
    },
};
//# sourceMappingURL=communication.client.js.map