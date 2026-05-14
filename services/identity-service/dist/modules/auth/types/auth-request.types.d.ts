import type { Request } from 'express';
import type { JwtPayload } from '@spancle/types';
import type { TenantContext } from '@spancle/auth-sdk';
/**
 * AuthenticatedRequest — Express Request after both TenantGuard and
 * JwtAuthGuard have run successfully.
 *
 * Guarantees:
 *   - request.tenant  is a valid TenantContext with verified tenantId
 *   - request.user    is a validated JwtPayload from a signed access token
 *
 * Use in controllers via @CurrentUser() and @TenantCtx() decorators.
 * Never access request.user directly — use the decorator to ensure type safety.
 */
export interface AuthenticatedRequest extends Request {
    user: JwtPayload;
    tenant: TenantContext;
}
/**
 * TenantRequest — Express Request after TenantGuard has run.
 * Used on public endpoints that need tenant context but no auth.
 */
export interface TenantRequest extends Request {
    tenant: TenantContext;
}
/**
 * ActiveSession — shape stored in Redis per authenticated user.
 */
export interface ActiveSession {
    userId: string;
    identityId: string;
    tenantId: string;
    role: string;
    jti: string;
    issuedAt: number;
    expiresAt: number;
    userAgent?: string;
    ipAddress?: string;
}
/**
 * RefreshTokenRecord — persisted in Redis with TTL matching refresh expiry.
 */
export interface RefreshTokenRecord {
    tokenId: string;
    identityId: string;
    userId: string;
    tenantId: string;
    role: string;
    jti: string;
    family: string;
    issuedAt: number;
    expiresAt: number;
    userAgent?: string;
    ipAddress?: string;
}
//# sourceMappingURL=auth-request.types.d.ts.map