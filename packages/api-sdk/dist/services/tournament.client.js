"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TournamentClient = void 0;
const http_client_1 = require("../core/http-client");
const http = (0, http_client_1.createHttpClient)('tournament');
/**
 * TournamentClient — typed client for tournament-service.
 *
 * Covers: tournament lifecycle, bracket generation, match scheduling and results.
 */
exports.TournamentClient = {
    // ── Tournaments ───────────────────────────────────────────────────────────
    async createTournament(dto, ctx) {
        return http.post('/tournaments', dto, ctx);
    },
    async getTournamentById(tournamentId, ctx) {
        return http.get(`/tournaments/${tournamentId}`, ctx);
    },
    async listTournaments(params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/tournaments${query ? `?${query}` : ''}`, ctx);
    },
    async updateTournament(tournamentId, dto, ctx) {
        return http.patch(`/tournaments/${tournamentId}`, dto, ctx);
    },
    async startTournament(tournamentId, ctx) {
        return http.post(`/tournaments/${tournamentId}/start`, {}, ctx);
    },
    async completeTournament(tournamentId, ctx) {
        return http.post(`/tournaments/${tournamentId}/complete`, {}, ctx);
    },
    async cancelTournament(tournamentId, reason, ctx) {
        return http.post(`/tournaments/${tournamentId}/cancel`, { reason }, ctx);
    },
    // ── Brackets ──────────────────────────────────────────────────────────────
    async generateBracket(tournamentId, ctx) {
        return http.post(`/tournaments/${tournamentId}/bracket/generate`, {}, ctx);
    },
    async getBracket(tournamentId, ctx) {
        return http.get(`/tournaments/${tournamentId}/bracket`, ctx);
    },
    // ── Matches ───────────────────────────────────────────────────────────────
    async getMatchById(matchId, ctx) {
        return http.get(`/matches/${matchId}`, ctx);
    },
    async listMatchesByTournament(tournamentId, params, ctx) {
        const query = new URLSearchParams(Object.entries(params)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])).toString();
        return http.get(`/tournaments/${tournamentId}/matches${query ? `?${query}` : ''}`, ctx);
    },
    async recordMatchResult(matchId, dto, ctx) {
        return http.post(`/matches/${matchId}/result`, dto, ctx);
    },
};
//# sourceMappingURL=tournament.client.js.map