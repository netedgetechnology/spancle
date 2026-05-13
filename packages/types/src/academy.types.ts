import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';

export const PlayerLevelSchema = z.enum([
  'beginner', 'intermediate', 'advanced', 'elite', 'professional',
]);
export type PlayerLevel = z.infer<typeof PlayerLevelSchema>;

export const CoachLicenseSchema = z.enum([
  'none', 'level_1', 'level_2', 'level_3', 'pro', 'elite',
]);
export type CoachLicense = z.infer<typeof CoachLicenseSchema>;

export const PlayerStatusSchema = z.enum([
  'prospect', 'registered', 'active', 'inactive', 'suspended', 'graduated',
]);
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;

export const CreatePlayerSchema = z.object({
  userId:        z.string().uuid(),
  academyId:     z.string().uuid(),
  level:         PlayerLevelSchema.default('beginner'),
  position:      z.string().max(50).optional(),
  jerseyNumber:  z.number().int().min(1).max(999).optional(),
  sport:         z.string().max(50),
  joinDate:      z.string().date().optional(),
});

export type CreatePlayerDto = z.infer<typeof CreatePlayerSchema>;

export const CreateCoachSchema = z.object({
  userId:     z.string().uuid(),
  academyId:  z.string().uuid(),
  license:    CoachLicenseSchema.default('none'),
  speciality: z.string().max(100).optional(),
  sports:     z.array(z.string().max(50)).min(1),
});

export type CreateCoachDto = z.infer<typeof CreateCoachSchema>;

export interface Academy extends AuditFields {
  id:          UUID;
  tenantId:    TenantId;
  name:        string;
  description?: string;
  sport:       string;
  isActive:    boolean;
  isDeleted:   boolean;
}

export interface Player extends AuditFields {
  id:           UUID;
  tenantId:     TenantId;
  userId:       UUID;
  academyId:    UUID;
  level:        PlayerLevel;
  status:       PlayerStatus;
  position?:    string;
  jerseyNumber?: number;
  sport:        string;
  joinDate?:    Date;
  isDeleted:    boolean;
}
