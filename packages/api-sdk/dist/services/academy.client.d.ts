import type { Academy, Player, CreatePlayerDto, CreateCoachDto, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * AcademyClient — typed client for academy-service.
 *
 * Covers: academy management, player registration, coach assignments.
 */
export declare const AcademyClient: {
    createAcademy(dto: {
        name: string;
        sport: string;
        description?: string;
    }, ctx: RequestContext): Promise<Academy>;
    getAcademyById(academyId: string, ctx: RequestContext): Promise<Academy>;
    listAcademies(params: {
        page?: number;
        limit?: number;
        sport?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Academy>>;
    updateAcademy(academyId: string, dto: Partial<{
        name: string;
        description: string;
    }>, ctx: RequestContext): Promise<Academy>;
    registerPlayer(dto: CreatePlayerDto, ctx: RequestContext): Promise<Player>;
    getPlayerById(playerId: string, ctx: RequestContext): Promise<Player>;
    listPlayers(params: {
        page?: number;
        limit?: number;
        academyId?: string;
        level?: string;
        status?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Player>>;
    updatePlayer(playerId: string, dto: Partial<CreatePlayerDto>, ctx: RequestContext): Promise<Player>;
    changePlayerLevel(playerId: string, dto: {
        level: string;
        reason?: string;
    }, ctx: RequestContext): Promise<Player>;
    suspendPlayer(playerId: string, reason: string, ctx: RequestContext): Promise<Player>;
    assignCoach(dto: CreateCoachDto, ctx: RequestContext): Promise<unknown>;
    listCoachesByAcademy(academyId: string, params: {
        page?: number;
        limit?: number;
    }, ctx: RequestContext): Promise<PaginatedResult<unknown>>;
};
//# sourceMappingURL=academy.client.d.ts.map