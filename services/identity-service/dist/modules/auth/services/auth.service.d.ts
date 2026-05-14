import { EventEmitter2 } from '@nestjs/event-emitter';
import type { TokenPair } from '@spancle/types';
import { IdentityRepository } from '../../identity/repositories/identity.repository';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import type { LoginDto, LogoutDto, RefreshTokenDto, ChangePasswordDto } from '../dto/login.dto';
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
export declare class AuthService {
    private readonly identityRepository;
    private readonly passwordService;
    private readonly tokenService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(identityRepository: IdentityRepository, passwordService: PasswordService, tokenService: TokenService, eventEmitter: EventEmitter2);
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
    login(dto: LoginDto, tenantId: string, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<TokenPair>;
    refreshToken(dto: RefreshTokenDto, tenantId: string, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<TokenPair>;
    logout(dto: LogoutDto, tenantId: string, currentJti: string, currentUserId: string, currentIdentityId: string, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    changePassword(dto: ChangePasswordDto, identityId: string, tenantId: string, actorId: string, meta?: {
        ipAddress?: string;
        userAgent?: string;
    }): Promise<void>;
    private emitLoginSuccess;
    private emitLoginFailed;
    private emitAccountLocked;
}
//# sourceMappingURL=auth.service.d.ts.map