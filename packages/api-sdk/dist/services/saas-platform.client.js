"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SaasPlatformClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('saas-platform');
/**
 * SaasPlatformClient — typed client for saas-platform-service.
 *
 * Covers: tenant provisioning, subscription management, plan configuration.
 * Superadmin operations use RequestContext.system().
 */
exports.SaasPlatformClient = {
    // ── Tenants ───────────────────────────────────────────────────────────────
    async createTenant(dto, ctx) {
        return http.post('/tenants', dto, ctx);
    },
    async getTenantById(tenantId, ctx) {
        return http.get(`/tenants/${tenantId}`, ctx);
    },
    async getTenantBySlug(slug, ctx) {
        return http.get(`/tenants/slug/${slug}`, ctx);
    },
    async listTenants(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/tenants${query ? `?${query}` : ''}`, ctx);
    },
    async updateTenant(tenantId, dto, ctx) {
        return http.patch(`/tenants/${tenantId}`, dto, ctx);
    },
    async updateTenantSettings(tenantId, settings, ctx) {
        return http.patch(`/tenants/${tenantId}/settings`, settings, ctx);
    },
    async suspendTenant(tenantId, reason, ctx) {
        return http.post(`/tenants/${tenantId}/suspend`, { reason }, ctx);
    },
    async activateTenant(tenantId, ctx) {
        return http.post(`/tenants/${tenantId}/activate`, {}, ctx);
    },
    async terminateTenant(tenantId, reason, ctx) {
        return http.post(`/tenants/${tenantId}/terminate`, { reason }, ctx);
    },
    // ── Subscriptions ─────────────────────────────────────────────────────────
    async changeTier(tenantId, newTier, ctx) {
        return http.post(`/tenants/${tenantId}/tier`, { tier: newTier }, ctx);
    },
};
//# sourceMappingURL=saas-platform.client.js.map