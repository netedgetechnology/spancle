"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AcademyClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('academy');
/**
 * AcademyClient — typed client for academy-service.
 *
 * Covers: academy management, player registration, coach assignments.
 */
exports.AcademyClient = {
    // ── Academies ─────────────────────────────────────────────────────────────
    async createAcademy(dto, ctx) {
        return http.post('/academies', dto, ctx);
    },
    async getAcademyById(academyId, ctx) {
        return http.get(`/academies/${academyId}`, ctx);
    },
    async listAcademies(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/academies${query ? `?${query}` : ''}`, ctx);
    },
    async updateAcademy(academyId, dto, ctx) {
        return http.patch(`/academies/${academyId}`, dto, ctx);
    },
    // ── Players ───────────────────────────────────────────────────────────────
    async registerPlayer(dto, ctx) {
        return http.post('/players', dto, ctx);
    },
    async getPlayerById(playerId, ctx) {
        return http.get(`/players/${playerId}`, ctx);
    },
    async listPlayers(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/players${query ? `?${query}` : ''}`, ctx);
    },
    async updatePlayer(playerId, dto, ctx) {
        return http.patch(`/players/${playerId}`, dto, ctx);
    },
    async changePlayerLevel(playerId, dto, ctx) {
        return http.post(`/players/${playerId}/level`, dto, ctx);
    },
    async suspendPlayer(playerId, reason, ctx) {
        return http.post(`/players/${playerId}/suspend`, { reason }, ctx);
    },
    // ── Coaches ───────────────────────────────────────────────────────────────
    async assignCoach(dto, ctx) {
        return http.post('/coaches', dto, ctx);
    },
    async listCoachesByAcademy(academyId, params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/academies/${academyId}/coaches${query ? `?${query}` : ''}`, ctx);
    },
};
//# sourceMappingURL=academy.client.js.map