import { z } from 'zod';
import type { AuditFields, Address, UUID } from './common.types';
import { AddressSchema } from './common.types';

export const TenantStatusSchema = z.enum(['pending', 'active', 'suspended', 'terminated', 'trial']);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const TenantTierSchema = z.enum(['free', 'starter', 'growth', 'pro', 'enterprise']);
export type TenantTier = z.infer<typeof TenantTierSchema>;

export const TenantSettingsSchema = z.object({
  timezone:            z.string().default('UTC'),
  locale:              z.string().default('en-GB'),
  currency:            z.string().length(3).default('GBP'),
  dateFormat:          z.string().default('DD/MM/YYYY'),
  allowPublicBookings: z.boolean().default(false),
  requireMfa:          z.boolean().default(false),
  maxSessionDurationMs: z.number().int().positive().default(8 * 60 * 60 * 1000),
});

export type TenantSettings = z.infer<typeof TenantSettingsSchema>;

export const CreateTenantSchema = z.object({
  name:     z.string().min(2).max(100),
  slug:     z.string().min(2).max(63).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  tier:     TenantTierSchema.default('free'),
  email:    z.string().email(),
  phone:    z.string().max(30).optional(),
  address:  AddressSchema.optional(),
  settings: TenantSettingsSchema.partial().optional(),
});

export type CreateTenantDto = z.infer<typeof CreateTenantSchema>;

export interface Tenant extends AuditFields {
  id:         UUID;
  name:       string;
  slug:       string;
  status:     TenantStatus;
  tier:       TenantTier;
  email:      string;
  phone?:     string;
  address?:   Address;
  settings:   TenantSettings;
  logoUrl?:   string;
  isDeleted:  boolean;
}
