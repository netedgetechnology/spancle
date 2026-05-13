import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { TokenPair } from '@spancle/types';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantCtx } from '../../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Public } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../../common/guards/tenant.guard';
import type { TenantContext } from '@spancle/auth-sdk';
import type { JwtPayload } from '@spancle/types';
import { AuthService } from '../services/auth.service';
import {
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  ChangePasswordDto,
} from '../dto/login.dto';

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
@Controller('auth')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   *
   * Public endpoint — no JWT required.
   * Requires x-tenant-id header.
   * Returns access + refresh token pair on success.
   */
  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<TokenPair> {
    return this.authService.login(dto, tenant.tenantId);
  }

  /**
   * POST /api/v1/auth/refresh
   *
   * Exchanges a valid refresh token for a new token pair.
   * Old refresh token is consumed — one-time-use only.
   * Refresh token reuse triggers full session revocation.
   */
  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<TokenPair> {
    return this.authService.refreshToken(dto, tenant.tenantId);
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Requires valid access token (authenticated endpoint).
   * Blacklists the access token JTI and deletes the refresh token.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body() dto: LogoutDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.authService.logout(
      dto,
      tenant.tenantId,
      user.jti ?? user.sub,
      user.userId,
      user.sub,
    );
  }

  /**
   * POST /api/v1/auth/change-password
   *
   * Requires valid access token.
   * Verifies current password before accepting change.
   * All active sessions are revoked on success.
   * Full password policy enforced on the new password.
   */
  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.authService.changePassword(
      dto,
      user.sub,
      tenant.tenantId,
      user.userId,
    );
  }
}
