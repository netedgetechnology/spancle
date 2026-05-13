import { z } from 'zod';
import { EventRegistry } from '../core/event-registry';

const BaseTenantPayload = z.object({
  tenantId:   z.string().uuid(),
  actorId:    z.string().uuid().optional(),
});

export const TenantCreatedPayloadSchema = BaseTenantPayload.extend({
  name:       z.string(),
  slug:       z.string(),
  tier:       z.string(),
  ownerEmail: z.string().email(),
});

export const TenantStatusChangedPayloadSchema = BaseTenantPayload.extend({
  previousStatus: z.string(),
  newStatus:      z.string(),
  reason:         z.string().optional(),
});

export const TenantTierChangedPayloadSchema = BaseTenantPayload.extend({
  previousTier: z.string(),
  newTier:      z.string(),
  effectiveAt:  z.string().datetime().optional(),
});

export type TenantCreatedPayload       = z.infer<typeof TenantCreatedPayloadSchema>;
export type TenantStatusChangedPayload = z.infer<typeof TenantStatusChangedPayloadSchema>;
export type TenantTierChangedPayload   = z.infer<typeof TenantTierChangedPayloadSchema>;

export const TENANT_EVENT_SCHEMAS = {
  [EventRegistry.TENANT_CREATED]:     TenantCreatedPayloadSchema,
  [EventRegistry.TENANT_ACTIVATED]:   TenantStatusChangedPayloadSchema,
  [EventRegistry.TENANT_SUSPENDED]:   TenantStatusChangedPayloadSchema,
  [EventRegistry.TENANT_TERMINATED]:  TenantStatusChangedPayloadSchema,
  [EventRegistry.TENANT_TIER_CHANGED]: TenantTierChangedPayloadSchema,
} as const;
