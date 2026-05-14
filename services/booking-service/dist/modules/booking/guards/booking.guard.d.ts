import { type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
/**
 * TenantGuard — validates x-tenant-id header and attaches tenant context.
 * Must run before any controller that uses @TenantCtx().
 */
export declare class TenantGuard implements CanActivate {
    private readonly logger;
    private readonly tenantHeader;
    canActivate(ctx: ExecutionContext): boolean;
}
/**
 * RbacGuard — enforces role-based access on booking routes.
 *
 * Reads actor context from:
 *   x-actor-id   — UUID of the acting user
 *   x-actor-role — their system role (passed by API Gateway / identity-service JWT validation)
 *
 * In production, the API Gateway validates the JWT and injects these headers.
 * The booking-service trusts them (internal network only — never exposed directly).
 *
 * Public routes (decorated @Public()) bypass all role checks.
 */
export declare class RbacGuard implements CanActivate {
    private readonly reflector;
    private readonly logger;
    constructor(reflector: Reflector);
    canActivate(ctx: ExecutionContext): boolean;
}
//# sourceMappingURL=booking.guard.d.ts.map