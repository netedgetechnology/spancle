import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
/**
 * PermissionsGuard — enforces @RequirePermissions() metadata.
 *
 * Execution position: after RolesGuard.
 *
 * Behaviour:
 *   - @Public()                               → always passes
 *   - No @RequirePermissions()                → passes
 *   - @RequirePermissions({resource, action}) → ALL listed permissions must be satisfied
 *   - SUPER_ADMIN                             → always passes (RbacEngine wildcard)
 *
 * Differs from RolesGuard:
 *   - RolesGuard checks WHAT role a user has
 *   - PermissionsGuard checks WHAT they can do with it
 *   Both can coexist on the same endpoint.
 */
export declare class PermissionsGuard implements CanActivate {
    private readonly reflector;
    private readonly logger;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=permissions.guard.d.ts.map