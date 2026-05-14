import type { Tournament, CreateTournamentDto, Match, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * TournamentClient — typed client for tournament-service.
 *
 * Covers: tournament lifecycle, bracket generation, match scheduling and results.
 */
export declare const TournamentClient: {
    createTournament(dto: CreateTournamentDto, ctx: RequestContext): Promise<Tournament>;
    getTournamentById(tournamentId: string, ctx: RequestContext): Promise<Tournament>;
    listTournaments(params: {
        page?: number;
        limit?: number;
        status?: string;
        sport?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Tournament>>;
    updateTournament(tournamentId: string, dto: Partial<CreateTournamentDto>, ctx: RequestContext): Promise<Tournament>;
    startTournament(tournamentId: string, ctx: RequestContext): Promise<Tournament>;
    completeTournament(tournamentId: string, ctx: RequestContext): Promise<Tournament>;
    cancelTournament(tournamentId: string, reason: string, ctx: RequestContext): Promise<Tournament>;
    generateBracket(tournamentId: string, ctx: RequestContext): Promise<{
        bracketId: string;
        rounds: number;
        matches: Match[];
    }>;
    getBracket(tournamentId: string, ctx: RequestContext): Promise<{
        bracketId: string;
        rounds: number;
        matches: Match[];
    }>;
    getMatchById(matchId: string, ctx: RequestContext): Promise<Match>;
    listMatchesByTournament(tournamentId: string, params: {
        page?: number;
        limit?: number;
        status?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Match>>;
    recordMatchResult(matchId: string, dto: {
        homeScore: number;
        awayScore: number;
        notes?: string;
    }, ctx: RequestContext): Promise<Match>;
};
//# sourceMappingURL=tournament.client.d.ts.map