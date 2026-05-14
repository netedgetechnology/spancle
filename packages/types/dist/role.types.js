"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateRoleSchema = exports.PermissionSchema = exports.SystemRoleSchema = void 0;
const zod_1 = require("zod");
exports.SystemRoleSchema = zod_1.z.enum([
    'SUPER_ADMIN',
    'TENANT_ADMIN',
    'TENANT_MANAGER',
    'COACH',
    'PLAYER',
    'PARENT',
    'OFFICIAL',
    'VIEWER',
]);
exports.PermissionSchema = zod_1.z.object({
    resource: zod_1.z.string(), // e.g. 'booking', 'player'
    action: zod_1.z.enum(['create', 'read', 'update', 'delete', 'manage']),
    scope: zod_1.z.enum(['own', 'tenant', 'global']).default('tenant'),
});
exports.CreateRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().max(500).optional(),
    permissions: zod_1.z.array(exports.PermissionSchema),
    isSystem: zod_1.z.boolean().default(false),
});
//# sourceMappingURL=role.types.js.map