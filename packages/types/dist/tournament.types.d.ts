import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';
export declare const TournamentStatusSchema: z.ZodEnum<["draft", "registration", "in_progress", "completed", "cancelled"]>;
export type TournamentStatus = z.infer<typeof TournamentStatusSchema>;
export declare const TournamentFormatSchema: z.ZodEnum<["single_elimination", "double_elimination", "round_robin", "swiss", "league", "group_stage"]>;
export type TournamentFormat = z.infer<typeof TournamentFormatSchema>;
export declare const MatchStatusSchema: z.ZodEnum<["scheduled", "in_progress", "completed", "forfeit", "postponed"]>;
export type MatchStatus = z.infer<typeof MatchStatusSchema>;
export declare const CreateTournamentSchema: z.ZodObject<{
    name: z.ZodString;
    format: z.ZodEnum<["single_elimination", "double_elimination", "round_robin", "swiss", "league", "group_stage"]>;
    sport: z.ZodString;
    maxTeams: z.ZodNumber;
    startDate: z.ZodString;
    endDate: z.ZodString;
    venueId: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    rules: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    sport: string;
    format: "single_elimination" | "double_elimination" | "round_robin" | "swiss" | "league" | "group_stage";
    maxTeams: number;
    startDate: string;
    endDate: string;
    description?: string | undefined;
    venueId?: string | undefined;
    rules?: string | undefined;
}, {
    name: string;
    sport: string;
    format: "single_elimination" | "double_elimination" | "round_robin" | "swiss" | "league" | "group_stage";
    maxTeams: number;
    startDate: string;
    endDate: string;
    description?: string | undefined;
    venueId?: string | undefined;
    rules?: string | undefined;
}>;
export type CreateTournamentDto = z.infer<typeof CreateTournamentSchema>;
export interface Tournament extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    name: string;
    format: TournamentFormat;
    sport: string;
    status: TournamentStatus;
    maxTeams: number;
    startDate: Date;
    endDate: Date;
    venueId?: UUID;
    description?: string;
    isDeleted: boolean;
}
export interface Match extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    tournamentId: UUID;
    bracketId?: UUID;
    homeTeamId: UUID;
    awayTeamId: UUID;
    status: MatchStatus;
    scheduledAt: Date;
    homeScore?: number;
    awayScore?: number;
    winnerId?: UUID;
    isDeleted: boolean;
}
//# sourceMappingURL=tournament.types.d.ts.map