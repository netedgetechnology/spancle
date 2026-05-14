import type {
  Tournament,
  CreateTournamentDto,
  Match,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('tournament');

/**
 * TournamentClient — typed client for tournament-service.
 *
 * Covers: tournament lifecycle, bracket generation, match scheduling and results.
 */
export const TournamentClient = {

  // ── Tournaments ───────────────────────────────────────────────────────────

  async createTournament(
    dto: CreateTournamentDto,
    ctx: RequestContext,
  ): Promise<Tournament> {
    return http.post<Tournament>('/tournaments', dto, ctx);
  },

  async getTournamentById(
    tournamentId: string,
    ctx: RequestContext,
  ): Promise<Tournament> {
    return http.get<Tournament>(`/tournaments/${tournamentId}`, ctx);
  },

  async listTournaments(
    params: { page?: number; limit?: number; status?: string; sport?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Tournament>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();
    return http.get<PaginatedResult<Tournament>>(
      `/tournaments${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async updateTournament(
    tournamentId: string,
    dto: Partial<CreateTournamentDto>,
    ctx: RequestContext,
  ): Promise<Tournament> {
    return http.patch<Tournament>(`/tournaments/${tournamentId}`, dto, ctx);
  },

  async startTournament(tournamentId: string, ctx: RequestContext): Promise<Tournament> {
    return http.post<Tournament>(`/tournaments/${tournamentId}/start`, {}, ctx);
  },

  async completeTournament(tournamentId: string, ctx: RequestContext): Promise<Tournament> {
    return http.post<Tournament>(`/tournaments/${tournamentId}/complete`, {}, ctx);
  },

  async cancelTournament(
    tournamentId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<Tournament> {
    return http.post<Tournament>(`/tournaments/${tournamentId}/cancel`, { reason }, ctx);
  },

  // ── Brackets ──────────────────────────────────────────────────────────────

  async generateBracket(
    tournamentId: string,
    ctx: RequestContext,
  ): Promise<{ bracketId: string; rounds: number; matches: Match[] }> {
    return http.post(`/tournaments/${tournamentId}/bracket/generate`, {}, ctx);
  },

  async getBracket(
    tournamentId: string,
    ctx: RequestContext,
  ): Promise<{ bracketId: string; rounds: number; matches: Match[] }> {
    return http.get(`/tournaments/${tournamentId}/bracket`, ctx);
  },

  // ── Matches ───────────────────────────────────────────────────────────────

  async getMatchById(matchId: string, ctx: RequestContext): Promise<Match> {
    return http.get<Match>(`/matches/${matchId}`, ctx);
  },

  async listMatchesByTournament(
    tournamentId: string,
    params: { page?: number; limit?: number; status?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Match>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();
    return http.get<PaginatedResult<Match>>(
      `/tournaments/${tournamentId}/matches${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async recordMatchResult(
    matchId: string,
    dto: { homeScore: number; awayScore: number; notes?: string },
    ctx: RequestContext,
  ): Promise<Match> {
    return http.post<Match>(`/matches/${matchId}/result`, dto, ctx);
  },
};
