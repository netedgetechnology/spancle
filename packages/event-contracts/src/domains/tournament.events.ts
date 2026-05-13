import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

const BaseTournamentPayload = z.object({
  tenantId:     z.string().uuid(),
  tournamentId: z.string().uuid(),
});

export const TournamentCreatedPayloadSchema = BaseTournamentPayload.extend({
  name:   z.string(),
  format: z.string(),
  sport:  z.string(),
  startDate: z.string().date(),
});

export const MatchCompletedPayloadSchema = z.object({
  tenantId:     z.string().uuid(),
  matchId:      z.string().uuid(),
  tournamentId: z.string().uuid(),
  homeTeamId:   z.string().uuid(),
  awayTeamId:   z.string().uuid(),
  homeScore:    z.number().int().min(0),
  awayScore:    z.number().int().min(0),
  winnerId:     z.string().uuid().nullable(),
  completedAt:  z.string().datetime(),
});

export type TournamentCreatedPayload = z.infer<typeof TournamentCreatedPayloadSchema>;
export type MatchCompletedPayload    = z.infer<typeof MatchCompletedPayloadSchema>;

export const TOURNAMENT_EVENT_SCHEMAS = {
  [EventRegistry.TOURNAMENT_CREATED]:   TournamentCreatedPayloadSchema,
  [EventRegistry.TOURNAMENT_STARTED]:   BaseTournamentPayload,
  [EventRegistry.TOURNAMENT_COMPLETED]: BaseTournamentPayload,
  [EventRegistry.MATCH_COMPLETED]:      MatchCompletedPayloadSchema,
} as const;
