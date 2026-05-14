import type { TokenPair } from '@spancle/types';
import type { TenantContext } from '@spancle/auth-sdk';
import type { JwtPayload } from '@spancle/types';
import { AuthService } from '../services/auth.service';
import { LoginDto, LogoutDto, RefreshTokenDto, ChangePasswordDto } from '../dto/login.dto';
/**
 * AuthController — all authentication endpoints.
 *
 * Guard execution order (declared at class level):
 *   TenantGuard → [JwtAuthGuard per method] → AuditInterceptor
 *
 * @Public() endpoints still require a valid tenant header.
 * TenantGuard allows @Public() routes without a tenant header only when
 * the header is absent — if present and malformed, it still rejects.
 *
 * All mutating operations go through AuditInterceptor automatically.
 */
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    /**
     * POST /api/v1/auth/login
     *
     * Public endpoint — no JWT required.
     * Requires x-tenant-id header.
     * Returns access + refresh token pair on success.
     */
    login(dto: LoginDto, tenant: TenantContext): Promise<TokenPair>;
    /**
     * POST /api/v1/auth/refresh
     *
     * Exchanges a valid refresh token for a new token pair.
     * Old refresh token is consumed — one-time-use only.
     * Refresh token reuse triggers full session revocation.
     */
    refreshToken(dto: RefreshTokenDto, tenant: TenantContext): Promise<TokenPair>;
    /**
     * POST /api/v1/auth/logout
     *
     * Requires valid access token (authenticated endpoint).
     * Blacklists the access token JTI and deletes the refresh token.
     */
    logout(dto: LogoutDto, tenant: TenantContext, user: JwtPayload): Promise<void>;
    /**
     * POST /api/v1/auth/change-password
     *
     * Requires valid access token.
     * Verifies current password before accepting change.
     * All active sessions are revoked on success.
     * Full password policy enforced on the new password.
     */
    changePassword(dto: ChangePasswordDto, tenant: TenantContext, user: JwtPayload): Promise<void>;
}
//# sourceMappingURL=auth.controller.d.ts.map