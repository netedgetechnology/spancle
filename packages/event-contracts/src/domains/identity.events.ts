import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

// ── Schemas ───────────────────────────────────────────────────────────────────

const BaseIdentityPayload = z.object({
  tenantId:   z.string().uuid(),
  identityId: z.string().uuid(),
  userId:     z.string().uuid(),
});

export const LoginSuccessPayloadSchema = BaseIdentityPayload.extend({
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  sessionId: z.string().optional(),
});

export const LoginFailedPayloadSchema = BaseIdentityPayload.extend({
  reason:       z.string(),
  attemptCount: z.number().int().min(1),
  ipAddress:    z.string().optional(),
});

export const PasswordChangedPayloadSchema = BaseIdentityPayload.extend({
  changedBy:    z.string().uuid(),
  triggeredBy:  z.enum(['user', 'admin', 'reset_flow']),
});

export const AccountLockedPayloadSchema = BaseIdentityPayload.extend({
  lockedUntil:  z.string().datetime(),
  reason:       z.string(),
  attemptCount: z.number().int(),
});

export const IdentityCreatedPayloadSchema = BaseIdentityPayload.extend({
  email:      z.string().email(),
  createdBy:  z.string().uuid().optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoginSuccessPayload    = z.infer<typeof LoginSuccessPayloadSchema>;
export type LoginFailedPayload     = z.infer<typeof LoginFailedPayloadSchema>;
export type PasswordChangedPayload = z.infer<typeof PasswordChangedPayloadSchema>;
export type AccountLockedPayload   = z.infer<typeof AccountLockedPayloadSchema>;
export type IdentityCreatedPayload = z.infer<typeof IdentityCreatedPayloadSchema>;

// ── Channel map ───────────────────────────────────────────────────────────────

export const IDENTITY_EVENT_SCHEMAS = {
  [EventRegistry.IDENTITY_LOGIN_SUCCESS]:    LoginSuccessPayloadSchema,
  [EventRegistry.IDENTITY_LOGIN_FAILED]:     LoginFailedPayloadSchema,
  [EventRegistry.IDENTITY_PASSWORD_CHANGED]: PasswordChangedPayloadSchema,
  [EventRegistry.IDENTITY_ACCOUNT_LOCKED]:   AccountLockedPayloadSchema,
  [EventRegistry.IDENTITY_CREATED]:          IdentityCreatedPayloadSchema,
} as const;
