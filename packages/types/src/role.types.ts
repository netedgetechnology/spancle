import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';

export const SystemRoleSchema = z.enum([
  'SUPER_ADMIN',
  'TENANT_ADMIN',
  'TENANT_MANAGER',
  'COACH',
  'PLAYER',
  'PARENT',
  'OFFICIAL',
  'VIEWER',
]);

export type SystemRole = z.infer<typeof SystemRoleSchema>;

export const PermissionSchema = z.object({
  resource: z.string(),                                         // e.g. 'booking', 'player'
  action:   z.enum(['create', 'read', 'update', 'delete', 'manage']),
  scope:    z.enum(['own', 'tenant', 'global']).default('tenant'),
});

export type Permission = z.infer<typeof PermissionSchema>;

export const CreateRoleSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(PermissionSchema),
  isSystem:    z.boolean().default(false),
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

export interface Role extends AuditFields {
  id:          UUID;
  tenantId:    TenantId;
  name:        string;
  description?: string;
  permissions: Permission[];
  isSystem:    boolean;
  isDeleted:   boolean;
}
