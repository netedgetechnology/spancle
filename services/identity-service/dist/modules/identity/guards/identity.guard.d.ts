import { type CanActivate, type ExecutionContext } from '@nestjs/common';
/**
 * TenantGuard — resolves tenant context from the configured header.
 * Must be the first guard in the chain on every controller.
 *
 * Sets request.tenant so downstream services and decorators can read it.
 * Throws 401 (not 400) to avoid leaking tenant resolution logic to clients.
 */
export declare class TenantGuard implements CanActivate {
    private readonly logger;
    private readonly tenantHeader;
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=identity.guard.d.ts.map