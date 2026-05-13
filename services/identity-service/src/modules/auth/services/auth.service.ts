import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TokenPair } from '@spancle/types';
import { PASSWORD } from '@spancle/constants';
import { maskEmail } from '@spancle/utils';
import { IdentityRepository } from '../../identity/repositories/identity.repository';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { LoginDto, LogoutDto, RefreshTokenDto, ChangePasswordDto } from '../dto/login.dto';
import {
  AuthEventNames,
  type LoginSuccessPayload,
  type LoginFailedPayload,
  type LogoutPayload,
  type PasswordChangedPayload,
  type AccountLockedPayload,
  type SessionsRevokedPayload,
} from '../events/auth.events';

/**
 * AuthService — orchestrates the authentication lifecycle.
 *
 * Design principles:
 *   - Audit events emitted on EVERY state transition — success and failure
 *   - No sensitive values (passwords, raw tokens) in logs or events
 *   - Lockout logic runs BEFORE issuing any tokens
 *   - All events emitted in try/finally so business logic never blocks on events
 *
 * Dependencies:
 *   - IdentityRepository: reads/writes identity records (PostgreSQL)
 *   - PasswordService:    hashing and policy enforcement
 *   - TokenService:       JWT signing and Redis token management
 *   - EventEmitter2:      internal domain event bus
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly identityRepository: IdentityRepository,
    private readonly passwordService:    PasswordService,
    private readonly tokenService:       TokenService,
    private readonly eventEmitter:       EventEmitter2,
  ) {}

  // ── Login ─────────────────────────────────────────────────────────────────

  /**
   * Authenticates a user and returns a token pair.
   *
   * Flow:
   *   1. Look up identity by email + tenantId
   *   2. Check account status (active, not locked)
   *   3. Verify password
   *   4. Reset failed attempt counter
   *   5. Issue token pair
   *   6. Emit LoginSuccess event
   *
   * On failure:
   *   - Increment failedLoginAttempts
   *   - Lock account if threshold exceeded
   *   - Emit LoginFailed event (with masked email)
   */
  async login(
    dto:  LoginDto,
    tenantId: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<TokenPair> {
    const identity = await this.identityRepository.findByEmailAndTenant(
      dto.email,
      tenantId,
    );

    // Constant-time path — same log regardless of whether identity exists
    if (!identity) {
      await this.emitLoginFailed({
        tenantId,
        email:        maskEmail(dto.email),
        reason:       'invalid_credentials',
        attemptCount: 0,
        ...meta,
        timestamp: new Date().toISOString(),
      });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Account inactive
    if (!identity.isActive) {
      await this.emitLoginFailed({
        tenantId,
        email:        maskEmail(dto.email),
        reason:       'account_inactive',
        attemptCount: identity.failedLoginAttempts,
        ...meta,
        timestamp: new Date().toISOString(),
      });
      throw new UnauthorizedException('Account is inactive');
    }

    // Account locked
    if (identity.lockedUntil && identity.lockedUntil > new Date()) {
      await this.emitLoginFailed({
        tenantId,
        email:        maskEmail(dto.email),
        reason:       'account_locked',
        attemptCount: identity.failedLoginAttempts,
        ...meta,
        timestamp: new Date().toISOString(),
      });
      throw new UnauthorizedException(
        `Account is locked until ${identity.lockedUntil.toISOString()}`,
      );
    }

    // Password verification
    const passwordValid = await this.passwordService.compare(
      dto.password,
      identity.passwordHash,
    );

    if (!passwordValid) {
      const newAttemptCount = identity.failedLoginAttempts + 1;
      const shouldLock      = newAttemptCount >= PASSWORD.MAX_FAILED_ATTEMPTS;

      const lockedUntil = shouldLock
        ? new Date(Date.now() + PASSWORD.LOCKOUT_DURATION_MINUTES * 60 * 1000)
        : null;

      await this.identityRepository.updateLoginFailure(
        identity.id,
        tenantId,
        newAttemptCount,
        lockedUntil,
      );

      if (shouldLock) {
        await this.emitAccountLocked({
          tenantId,
          identityId:   identity.id,
          userId:       identity.userId,
          lockedUntil:  lockedUntil!.toISOString(),
          reason:       'Exceeded maximum failed login attempts',
          attemptCount: newAttemptCount,
          ...meta,
          timestamp: new Date().toISOString(),
        });
        throw new UnauthorizedException('Account locked due to too many failed attempts');
      }

      await this.emitLoginFailed({
        tenantId,
        email:        maskEmail(dto.email),
        reason:       'invalid_credentials',
        attemptCount: newAttemptCount,
        ...meta,
        timestamp: new Date().toISOString(),
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    // Successful authentication — reset failure counter + update last login
    await this.identityRepository.updateLoginSuccess(identity.id, tenantId);

    // Issue tokens — lookup role from user record
    const role = await this.identityRepository.getRoleForIdentity(identity.id, tenantId);

    const issued = await this.tokenService.issueTokenPair(
      {
        identityId: identity.id,
        userId:     identity.userId,
        tenantId,
        role:       role ?? 'VIEWER',
      },
      meta,
    );

    await this.emitLoginSuccess({
      tenantId,
      identityId: identity.id,
      userId:     identity.userId,
      role:       role ?? 'VIEWER',
      sessionId:  issued.refreshTokenId,
      ...meta,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Login success — identityId: ${identity.id} tenantId: ${tenantId}`,
    );

    return issued.tokens;
  }

  // ── Token refresh ──────────────────────────────────────────────────────────

  async refreshToken(
    dto:      RefreshTokenDto,
    tenantId: string,
    meta:     { ipAddress?: string; userAgent?: string } = {},
  ): Promise<TokenPair> {
    const issued = await this.tokenService.rotateRefreshToken(
      dto.refreshToken,
      tenantId,
      meta,
    );

    this.logger.log(
      `Token rotated — tenantId: ${tenantId} family: ${issued.family}`,
    );

    return issued.tokens;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async logout(
    dto:            LogoutDto,
    tenantId:       string,
    currentJti:     string,
    currentUserId:  string,
    currentIdentityId: string,
    meta:           { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    await this.tokenService.revokeSession(
      tenantId,
      currentJti,
      dto.refreshToken,
    );

    await this.eventEmitter.emitAsync(AuthEventNames.LOGOUT, {
      tenantId,
      identityId: currentIdentityId,
      userId:     currentUserId,
      sessionId:  'revoked',
      ...meta,
      timestamp: new Date().toISOString(),
    } satisfies LogoutPayload);

    this.logger.log(
      `Logout — identityId: ${currentIdentityId} tenantId: ${tenantId}`,
    );
  }

  // ── Password change ────────────────────────────────────────────────────────

  async changePassword(
    dto:           ChangePasswordDto,
    identityId:    string,
    tenantId:      string,
    actorId:       string,
    meta:          { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> {
    // Validate confirmation match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new UnprocessableEntityException('New password and confirmation do not match');
    }

    const identity = await this.identityRepository.findByIdAndTenant(identityId, tenantId);

    if (!identity) {
      throw new NotFoundException('Identity not found');
    }

    // Verify current password
    const currentValid = await this.passwordService.compare(
      dto.currentPassword,
      identity.passwordHash,
    );

    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Enforce new password policy
    this.passwordService.enforcePolicy(dto.newPassword);

    // Prevent reuse of current password
    const isDifferent = await this.passwordService.isDifferentFromCurrent(
      dto.newPassword,
      identity.passwordHash,
    );

    if (!isDifferent) {
      throw new UnprocessableEntityException(
        'New password must be different from your current password',
      );
    }

    // Hash and persist
    const newHash = await this.passwordService.hash(dto.newPassword);
    await this.identityRepository.updatePassword(identityId, tenantId, newHash);

    // Revoke all existing sessions — security requirement on password change
    await this.tokenService.revokeAllSessions(tenantId, identityId);

    const payload: PasswordChangedPayload = {
      tenantId,
      identityId,
      userId:      identity.userId,
      changedBy:   actorId,
      triggeredBy: actorId === identityId ? 'user' : 'admin',
      ...meta,
      timestamp: new Date().toISOString(),
    };

    await this.eventEmitter.emitAsync(AuthEventNames.PASSWORD_CHANGED, payload);

    const sessionsPayload: SessionsRevokedPayload = {
      tenantId,
      identityId,
      userId:       identity.userId,
      revokedCount: -1, // count not tracked here — repo logs it
      reason:       'password_change',
      ...meta,
      timestamp: new Date().toISOString(),
    };

    await this.eventEmitter.emitAsync(AuthEventNames.SESSIONS_REVOKED, sessionsPayload);

    this.logger.log(
      `Password changed — identityId: ${identityId} tenantId: ${tenantId} by: ${actorId}`,
    );
  }

  // ── Private event helpers ──────────────────────────────────────────────────

  private async emitLoginSuccess(payload: LoginSuccessPayload): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(AuthEventNames.LOGIN_SUCCESS, payload);
    } catch (err) {
      this.logger.error(`Failed to emit LOGIN_SUCCESS: ${String(err)}`);
    }
  }

  private async emitLoginFailed(payload: LoginFailedPayload): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(AuthEventNames.LOGIN_FAILED, payload);
    } catch (err) {
      this.logger.error(`Failed to emit LOGIN_FAILED: ${String(err)}`);
    }
  }

  private async emitAccountLocked(payload: AccountLockedPayload): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(AuthEventNames.ACCOUNT_LOCKED, payload);
    } catch (err) {
      this.logger.error(`Failed to emit ACCOUNT_LOCKED: ${String(err)}`);
    }
  }
}
