import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
declare const JwtAuthGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
/**
 * JwtAuthGuard — validates the Bearer access token on every protected route.
 *
 * Extends Passport's AuthGuard('jwt') to add:
 *   1. @Public() short-circuit — skips validation for public routes
 *   2. Structured error logging with request context
 *   3. Consistent 401 error shape for all auth failures
 *
 * Execution order guarantee:
 *   TenantGuard → JwtAuthGuard → RolesGuard → PermissionsGuard → Handler
 *
 * On success: sets request.user = JwtPayload (via JwtStrategy.validate())
 */
export declare class JwtAuthGuard extends JwtAuthGuard_base implements CanActivate {
    private readonly reflector;
    private readonly logger;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean | Promise<boolean>;
    /**
     * Called by Passport after strategy validation.
     * Overridden to provide structured error responses.
     */
    handleRequest<TUser>(err: Error | null, user: TUser | false, info: {
        message?: string;
        name?: string;
    } | undefined, context: ExecutionContext): TUser;
}
export {};
//# sourceMappingURL=jwt-auth.guard.d.ts.map