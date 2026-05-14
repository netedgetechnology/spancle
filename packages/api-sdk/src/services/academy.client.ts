import type {
  Academy,
  Player,
  CreatePlayerDto,
  CreateCoachDto,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('academy');

/**
 * AcademyClient — typed client for academy-service.
 *
 * Covers: academy management, player registration, coach assignments.
 */
export const AcademyClient = {

  // ── Academies ─────────────────────────────────────────────────────────────

  async createAcademy(
    dto: { name: string; sport: string; description?: string },
    ctx: RequestContext,
  ): Promise<Academy> {
    return http.post<Academy>('/academies', dto, ctx);
  },

  async getAcademyById(academyId: string, ctx: RequestContext): Promise<Academy> {
    return http.get<Academy>(`/academies/${academyId}`, ctx);
  },

  async listAcademies(
    params: { page?: number; limit?: number; sport?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Academy>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();
    return http.get<PaginatedResult<Academy>>(
      `/academies${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async updateAcademy(
    academyId: string,
    dto: Partial<{ name: string; description: string }>,
    ctx: RequestContext,
  ): Promise<Academy> {
    return http.patch<Academy>(`/academies/${academyId}`, dto, ctx);
  },

  // ── Players ───────────────────────────────────────────────────────────────

  async registerPlayer(dto: CreatePlayerDto, ctx: RequestContext): Promise<Player> {
    return http.post<Player>('/players', dto, ctx);
  },

  async getPlayerById(playerId: string, ctx: RequestContext): Promise<Player> {
    return http.get<Player>(`/players/${playerId}`, ctx);
  },

  async listPlayers(
    params: {
      page?: number;
      limit?: number;
      academyId?: string;
      level?: string;
      status?: string;
    },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Player>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();
    return http.get<PaginatedResult<Player>>(`/players${query ? `?${query}` : ''}`, ctx);
  },

  async updatePlayer(
    playerId: string,
    dto: Partial<CreatePlayerDto>,
    ctx: RequestContext,
  ): Promise<Player> {
    return http.patch<Player>(`/players/${playerId}`, dto, ctx);
  },

  async changePlayerLevel(
    playerId: string,
    dto: { level: string; reason?: string },
    ctx: RequestContext,
  ): Promise<Player> {
    return http.post<Player>(`/players/${playerId}/level`, dto, ctx);
  },

  async suspendPlayer(
    playerId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<Player> {
    return http.post<Player>(`/players/${playerId}/suspend`, { reason }, ctx);
  },

  // ── Coaches ───────────────────────────────────────────────────────────────

  async assignCoach(dto: CreateCoachDto, ctx: RequestContext): Promise<unknown> {
    return http.post('/coaches', dto, ctx);
  },

  async listCoachesByAcademy(
    academyId: string,
    params: { page?: number; limit?: number },
    ctx: RequestContext,
  ): Promise<PaginatedResult<unknown>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();
    return http.get<PaginatedResult<unknown>>(
      `/academies/${academyId}/coaches${query ? `?${query}` : ''}`,
      ctx,
    );
  },
};
