"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('identity');
/**
 * IdentityClient — typed client for identity-service.
 *
 * Covers: authentication, token lifecycle, user management.
 * All methods throw SpancleApiError on failure.
 */
exports.IdentityClient = {
    // ── Auth ──────────────────────────────────────────────────────────────────
    /**
     * Authenticates a user and returns an access/refresh token pair.
     * Does NOT require an access token in context — uses tenantId only.
     */
    async login(dto, ctx) {
        return http.post('/auth/login', dto, ctx);
    },
    /**
     * Exchanges a refresh token for a new token pair.
     */
    async refreshToken(dto, ctx) {
        return http.post('/auth/refresh', dto, ctx);
    },
    /**
     * Revokes the refresh token — invalidates the session.
     */
    async logout(dto, ctx) {
        return http.post('/auth/logout', dto, ctx);
    },
    // ── Identity resource ─────────────────────────────────────────────────────
    async getIdentityById(identityId, ctx) {
        return http.get(`/identities/${identityId}`, ctx);
    },
    async deactivateIdentity(identityId, ctx) {
        return http.delete(`/identities/${identityId}`, ctx);
    },
    // ── Users ─────────────────────────────────────────────────────────────────
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
};
//# sourceMappingURL=identity.client.js.map