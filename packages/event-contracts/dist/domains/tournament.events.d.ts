import { z } from 'zod';
export declare const TournamentCreatedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    tournamentId: z.ZodString;
} & {
    name: z.ZodString;
    format: z.ZodString;
    sport: z.ZodString;
    startDate: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    tenantId: string;
    tournamentId: string;
    format: string;
    sport: string;
    startDate: string;
}, {
    name: string;
    tenantId: string;
    tournamentId: string;
    format: string;
    sport: string;
    startDate: string;
}>;
export declare const MatchCompletedPayloadSchema: z.ZodObject<{
    tenantId: z.ZodString;
    matchId: z.ZodString;
    tournamentId: z.ZodString;
    homeTeamId: z.ZodString;
    awayTeamId: z.ZodString;
    homeScore: z.ZodNumber;
    awayScore: z.ZodNumber;
    winnerId: z.ZodNullable<z.ZodString>;
    completedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    tenantId: string;
    completedAt: string;
    tournamentId: string;
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    winnerId: string | null;
}, {
    tenantId: string;
    completedAt: string;
    tournamentId: string;
    matchId: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    winnerId: string | null;
}>;
export type TournamentCreatedPayload = z.infer<typeof TournamentCreatedPayloadSchema>;
export type MatchCompletedPayload = z.infer<typeof MatchCompletedPayloadSchema>;
export declare const TOURNAMENT_EVENT_SCHEMAS: {
    readonly "spancle.tournament.created": z.ZodObject<{
        tenantId: z.ZodString;
        tournamentId: z.ZodString;
    } & {
        name: z.ZodString;
        format: z.ZodString;
        sport: z.ZodString;
        startDate: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        name: string;
        tenantId: string;
        tournamentId: string;
        format: string;
        sport: string;
        startDate: string;
    }, {
        name: string;
        tenantId: string;
        tournamentId: string;
        format: string;
        sport: string;
        startDate: string;
    }>;
    readonly "spancle.tournament.started": z.ZodObject<{
        tenantId: z.ZodString;
        tournamentId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        tournamentId: string;
    }, {
        tenantId: string;
        tournamentId: string;
    }>;
    readonly "spancle.tournament.completed": z.ZodObject<{
        tenantId: z.ZodString;
        tournamentId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        tournamentId: string;
    }, {
        tenantId: string;
        tournamentId: string;
    }>;
    readonly "spancle.match.completed": z.ZodObject<{
        tenantId: z.ZodString;
        matchId: z.ZodString;
        tournamentId: z.ZodString;
        homeTeamId: z.ZodString;
        awayTeamId: z.ZodString;
        homeScore: z.ZodNumber;
        awayScore: z.ZodNumber;
        winnerId: z.ZodNullable<z.ZodString>;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        tenantId: string;
        completedAt: string;
        tournamentId: string;
        matchId: string;
        homeTeamId: string;
        awayTeamId: string;
        homeScore: number;
        awayScore: number;
        winnerId: string | null;
    }, {
        tenantId: string;
        completedAt: string;
        tournamentId: string;
        matchId: string;
        homeTeamId: string;
        awayTeamId: string;
        homeScore: number;
        awayScore: number;
        winnerId: string | null;
    }>;
};
//# sourceMappingURL=tournament.events.d.ts.map