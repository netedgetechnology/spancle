import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
/**
 * RolesGuard — enforces @Roles() metadata using the stateless RbacEngine.
 *
 * Execution position: after JwtAuthGuard (requires request.user to be populated).
 *
 * Behaviour:
 *   - @Public()          → always passes
 *   - No @Roles()        → passes (any authenticated user)
 *   - @Roles('X', 'Y')  → passes if user.role is X or Y
 *   - SUPER_ADMIN        → always passes (wildcard — handled by RbacEngine)
 *
 * Emits a structured log on denial — feeds into the audit pipeline.
 */
export declare class RolesGuard implements CanActivate {
    private readonly reflector;
    private readonly logger;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=roles.guard.d.ts.map