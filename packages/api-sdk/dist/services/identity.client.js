"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('identity');
/**
 * ============================================================================
 * IdentityClient
 * ============================================================================
 *
 * Owns:
 *
 * • Authentication
 * • Identity
 * • Users
 * • Platform Tenant Lifecycle
 *
 * This client maps directly to identity-service.
 *
 * ============================================================================
 */
exports.IdentityClient = {
    // -------------------------------------------------------------------------
    // Authentication
    // -------------------------------------------------------------------------
    /**
     * Login
     */
    async login(dto, ctx) {
        return http.post('/auth/login', dto, ctx);
    },
    /**
     * Refresh access token
     */
    async refreshToken(dto, ctx) {
        return http.post('/auth/refresh', dto, ctx);
    },
    /**
     * Logout
     */
    async logout(dto, ctx) {
        return http.post('/auth/logout', dto, ctx);
    },
    // -------------------------------------------------------------------------
    // Identity
    // -------------------------------------------------------------------------
    async getIdentityById(identityId, ctx) {
        return http.get(`/identities/${identityId}`, ctx);
    },
    async deactivateIdentity(identityId, ctx) {
        return http.delete(`/identities/${identityId}`, ctx);
    },
    // -------------------------------------------------------------------------
    // Users
    // -------------------------------------------------------------------------
    async createUser(dto, ctx) {
        return http.post('/users', dto, ctx);
    },
    async getUserById(userId, ctx) {
        return http.get(`/users/${userId}`, ctx);
    },
    async listUsers(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/users${query ? `?${query}` : ''}`, ctx);
    },
    async updateUser(userId, dto, ctx) {
        return http.patch(`/users/${userId}`, dto, ctx);
    },
    async deleteUser(userId, ctx) {
        return http.delete(`/users/${userId}`, ctx);
    },
    // -------------------------------------------------------------------------
    // Platform Tenant Lifecycle
    // -------------------------------------------------------------------------
    async createTenant(dto, ctx) {
        return http.post('/tenants', dto, ctx);
    },
    async listTenants(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/tenants${query ? `?${query}` : ''}`, ctx);
    },
    async getTenantById(tenantId, ctx) {
        return http.get(`/tenants/${tenantId}`, ctx);
    },
    async updateTenant(tenantId, dto, ctx) {
        return http.patch(`/tenants/${tenantId}`, dto, ctx);
    },
    async updateTenantSettings(tenantId, settings, ctx) {
        return http.patch(`/tenants/${tenantId}/settings`, {
            settings,
        }, ctx);
    },
    async activateTenant(tenantId, ctx) {
        return http.post(`/tenants/${tenantId}/activate`, {}, ctx);
    },
    async suspendTenant(tenantId, reason, ctx) {
        return http.post(`/tenants/${tenantId}/suspend`, {
            reason,
        }, ctx);
    },
    async terminateTenant(tenantId, reason, ctx) {
        return http.post(`/tenants/${tenantId}/terminate`, {
            reason,
        }, ctx);
    },
    async changeTier(tenantId, tier, ctx) {
        return http.patch(`/tenants/${tenantId}/tier`, {
            tier,
        }, ctx);
    },
    async checkSlugAvailable(slug, ctx) {
        return http.get(`/tenants/slug-available?slug=${encodeURIComponent(slug)}`, ctx);
    },
    async resolveTenant(query, ctx) {
        return http.get(`/tenants/resolve?q=${encodeURIComponent(query)}`, ctx);
    },
};
//# sourceMappingURL=identity.client.js.map