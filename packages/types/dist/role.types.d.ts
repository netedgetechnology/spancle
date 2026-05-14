import { z } from 'zod';
import type { AuditFields, TenantId, UUID } from './common.types';
export declare const SystemRoleSchema: z.ZodEnum<["SUPER_ADMIN", "TENANT_ADMIN", "TENANT_MANAGER", "COACH", "PLAYER", "PARENT", "OFFICIAL", "VIEWER"]>;
export type SystemRole = z.infer<typeof SystemRoleSchema>;
export declare const PermissionSchema: z.ZodObject<{
    resource: z.ZodString;
    action: z.ZodEnum<["create", "read", "update", "delete", "manage"]>;
    scope: z.ZodDefault<z.ZodEnum<["own", "tenant", "global"]>>;
}, "strip", z.ZodTypeAny, {
    resource: string;
    action: "create" | "read" | "update" | "delete" | "manage";
    scope: "own" | "tenant" | "global";
}, {
    resource: string;
    action: "create" | "read" | "update" | "delete" | "manage";
    scope?: "own" | "tenant" | "global" | undefined;
}>;
export type Permission = z.infer<typeof PermissionSchema>;
export declare const CreateRoleSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    permissions: z.ZodArray<z.ZodObject<{
        resource: z.ZodString;
        action: z.ZodEnum<["create", "read", "update", "delete", "manage"]>;
        scope: z.ZodDefault<z.ZodEnum<["own", "tenant", "global"]>>;
    }, "strip", z.ZodTypeAny, {
        resource: string;
        action: "create" | "read" | "update" | "delete" | "manage";
        scope: "own" | "tenant" | "global";
    }, {
        resource: string;
        action: "create" | "read" | "update" | "delete" | "manage";
        scope?: "own" | "tenant" | "global" | undefined;
    }>, "many">;
    isSystem: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    permissions: {
        resource: string;
        action: "create" | "read" | "update" | "delete" | "manage";
        scope: "own" | "tenant" | "global";
    }[];
    isSystem: boolean;
    description?: string | undefined;
}, {
    name: string;
    permissions: {
        resource: string;
        action: "create" | "read" | "update" | "delete" | "manage";
        scope?: "own" | "tenant" | "global" | undefined;
    }[];
    description?: string | undefined;
    isSystem?: boolean | undefined;
}>;
export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;
export interface Role extends AuditFields {
    id: UUID;
    tenantId: TenantId;
    name: string;
    description?: string;
    permissions: Permission[];
    isSystem: boolean;
    isDeleted: boolean;
}
//# sourceMappingURL=role.types.d.ts.map