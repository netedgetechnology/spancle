import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';

export const LoginSchema = z.object({
  email:    z.string().email().max(254),
  password: z.string().min(8).max(128),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const TokenPairSchema = z.object({
  accessToken:  z.string(),
  refreshToken: z.string(),
  expiresIn:    z.number().int().positive(),
  tokenType:    z.literal('Bearer').default('Bearer'),
});

export type TokenPair = z.infer<typeof TokenPairSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export const JwtPayloadSchema = z.object({
  sub:      z.string().uuid(),   // identityId
  userId:   z.string().uuid(),
  tenantId: z.string().uuid(),
  role:     z.string(),
  iat:      z.number(),
  exp:      z.number(),
  iss:      z.string(),
  jti:      z.string().optional(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;

export interface Identity extends AuditFields {
  id:                  UUID;
  tenantId:            TenantId;
  userId:              UUID;
  email:               string;
  isActive:            boolean;
  isEmailVerified:     boolean;
  failedLoginAttempts: number;
  lockedUntil:         Date | null;
  lastLoginAt:         Date | null;
  passwordChangedAt:   Date | null;
}
