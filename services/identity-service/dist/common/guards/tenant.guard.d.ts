import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
/**
 * TenantGuard — first guard in the chain on every controller.
 *
 * Responsibilities:
 *   1. Reads `x-tenant-id` header (configurable via TENANT_HEADER env var)
 *   2. Validates it is a well-formed UUID
 *   3. Constructs a TenantContext and attaches it to request.tenant
 *
 * Throws 401 (not 400) — avoids leaking tenant resolution logic to clients.
 * Returns 401 on @Public() routes too if tenant header is present but malformed.
 * Returns early (passes) if @Public() and no tenant header provided.
 */
export declare class TenantGuard implements CanActivate {
    private readonly reflector;
    private readonly logger;
    private readonly tenantHeader;
    private readonly uuidPattern;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=tenant.guard.d.ts.map