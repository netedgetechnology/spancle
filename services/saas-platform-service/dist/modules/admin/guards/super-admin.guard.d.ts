import { type CanActivate, type ExecutionContext } from '@nestjs/common';
/**
 * SuperAdminGuard — restricts access to SUPER_ADMIN role only.
 *
 * Applied at controller class level for all admin stats endpoints.
 * This is a defence-in-depth guard — the global RolesGuard also enforces
 * role checks, but this guard makes the SUPER_ADMIN requirement explicit
 * at the module level, independently of the global guard chain.
 *
 * Execution position: after JwtAuthGuard (requires request.user).
 *
 * Returns:
 *   - 401 if no authenticated user on the request
 *   - 403 if authenticated but not SUPER_ADMIN
 *   - passes if role === 'SUPER_ADMIN'
 */
export declare class SuperAdminGuard implements CanActivate {
    private readonly logger;
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=super-admin.guard.d.ts.map