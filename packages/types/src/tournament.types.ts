import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';

export const TournamentStatusSchema = z.enum([
  'draft', 'registration', 'in_progress', 'completed', 'cancelled',
]);
export type TournamentStatus = z.infer<typeof TournamentStatusSchema>;

export const TournamentFormatSchema = z.enum([
  'single_elimination', 'double_elimination', 'round_robin',
  'swiss', 'league', 'group_stage',
]);
export type TournamentFormat = z.infer<typeof TournamentFormatSchema>;

export const MatchStatusSchema = z.enum([
  'scheduled', 'in_progress', 'completed', 'forfeit', 'postponed',
]);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const CreateTournamentSchema = z.object({
  name:        z.string().min(2).max(200),
  format:      TournamentFormatSchema,
  sport:       z.string().max(50),
  maxTeams:    z.number().int().positive().max(256),
  startDate:   z.string().date(),
  endDate:     z.string().date(),
  venueId:     z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  rules:       z.string().max(5000).optional(),
});

export type CreateTournamentDto = z.infer<typeof CreateTournamentSchema>;

export interface Tournament extends AuditFields {
  id:          UUID;
  tenantId:    TenantId;
  name:        string;
  format:      TournamentFormat;
  sport:       string;
  status:      TournamentStatus;
  maxTeams:    number;
  startDate:   Date;
  endDate:     Date;
  venueId?:    UUID;
  description?: string;
  isDeleted:   boolean;
}

export interface Match extends AuditFields {
  id:           UUID;
  tenantId:     TenantId;
  tournamentId: UUID;
  bracketId?:   UUID;
  homeTeamId:   UUID;
  awayTeamId:   UUID;
  status:       MatchStatus;
  scheduledAt:  Date;
  homeScore?:   number;
  awayScore?:   number;
  winnerId?:    UUID;
  isDeleted:    boolean;
}
