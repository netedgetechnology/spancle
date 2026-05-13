import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

export const PlayerRegisteredPayloadSchema = z.object({
  tenantId:  z.string().uuid(),
  playerId:  z.string().uuid(),
  userId:    z.string().uuid(),
  academyId: z.string().uuid(),
  sport:     z.string(),
  level:     z.string(),
  joinDate:  z.string().date().optional(),
});

export const PlayerLevelChangedPayloadSchema = z.object({
  tenantId:      z.string().uuid(),
  playerId:      z.string().uuid(),
  previousLevel: z.string(),
  newLevel:      z.string(),
  changedBy:     z.string().uuid(),
});

export type PlayerRegisteredPayload   = z.infer<typeof PlayerRegisteredPayloadSchema>;
export type PlayerLevelChangedPayload = z.infer<typeof PlayerLevelChangedPayloadSchema>;

export const ACADEMY_EVENT_SCHEMAS = {
  [EventRegistry.PLAYER_REGISTERED]:   PlayerRegisteredPayloadSchema,
  [EventRegistry.PLAYER_LEVEL_CHANGED]: PlayerLevelChangedPayloadSchema,
} as const;
