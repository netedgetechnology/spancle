import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
/**
 * TenantStatusGuard — enforces tenant lifecycle state on every request.
 *
 * Execution position: after JwtAuthGuard, before RolesGuard.
 *
 * Status rules:
 *   - active / trial  → allowed
 *   - pending         → allowed (tenant is setting up)
 *   - suspended       → 503 Service Unavailable
 *   - terminated      → 503 Service Unavailable
 *
 * Unlike TenantGuard which validates the header format,
 * TenantStatusGuard validates the tenant's BUSINESS STATUS.
 *
 * @Public() routes are allowed for all statuses EXCEPT terminated.
 * Terminated tenants cannot access even public endpoints — their
 * data is in retention and their account is closed.
 */
export declare class TenantStatusGuard implements CanActivate {
    private readonly reflector;
    private readonly logger;
    constructor(reflector: Reflector);
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=tenant-status.guard.d.ts.map