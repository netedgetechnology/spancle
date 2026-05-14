import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TenantService } from '../../tenant/services/tenant.service';
import { UserService } from '../../user/services/user.service';
import { PasswordService } from '../../auth/services/password.service';
import { TokenService } from '../../auth/services/token.service';
import { IdentityRepository } from '../../identity/repositories/identity.repository';
import { TenantRepository } from '../../tenant/repositories/tenant.repository';
import { OnboardingTokenService } from './onboarding-token.service';
import type { SignupDto, VerifyEmailDto, SelectPackageDto, CompleteOnboardingDto, ResendVerificationDto } from '../dto/onboarding.dto';
/**
 * OnboardingService — orchestrates the 6-step tenant onboarding saga.
 *
 * Steps:
 *   1. signup()           — create registration record + send verification email
 *   2. verifyEmail()      — validate token → mark emailVerified = true
 *   3. selectPackage()    — record chosen package + billing cycle
 *   4. complete()         — provision tenant + subscription + admin user + identity
 *
 * Cross-service calls:
 *   - saas-platform-service: GET /api/v1/packages/active (package catalogue)
 *   - saas-platform-service: POST /api/v1/subscriptions (create trial subscription)
 *   - communication-service: POST /api/v1/emails/send (verification + welcome email)
 *
 * All calls use internal HTTP with 5s timeout.
 * On failure: tenant is set to 'pending', error logged, event emitted for retry.
 */
export declare class OnboardingService {
    private readonly tokenService;
    private readonly tenantService;
    private readonly userService;
    private readonly passwordService;
    private readonly jwtTokenService;
    private readonly identityRepository;
    private readonly tenantRepository;
    private readonly eventEmitter;
    private readonly httpService;
    private readonly config;
    private readonly logger;
    constructor(tokenService: OnboardingTokenService, tenantService: TenantService, userService: UserService, passwordService: PasswordService, jwtTokenService: TokenService, identityRepository: IdentityRepository, tenantRepository: TenantRepository, eventEmitter: EventEmitter2, httpService: HttpService, config: ConfigService);
    /**
     * Initiates onboarding — validates uniqueness, creates registration state,
     * triggers email verification.
     *
     * Checks:
     *   1. Slug is not reserved (Redis cache)
     *   2. Slug is not taken in DB
     *   3. Email is not already in a pending registration (Redis)
     *   4. Email is not already the owner of an existing tenant
     */
    signup(dto: SignupDto): Promise<{
        registrationId: string;
        maskedEmail: string;
    }>;
    /**
     * Validates the email verification token.
     * Token is single-use — consumed immediately on valid match.
     */
    verifyEmail(dto: VerifyEmailDto): Promise<{
        verified: boolean;
    }>;
    /**
     * Resends the verification email.
     * Generates a new token (invalidates the previous one).
     * Rate-limited at nginx; also throttled by ThrottlerGuard.
     */
    resendVerification(dto: ResendVerificationDto): Promise<{
        sent: boolean;
    }>;
    /**
     * Records the tenant's chosen package and billing cycle.
     * Validates that the package exists and is active.
     */
    selectPackage(dto: SelectPackageDto): Promise<{
        recorded: boolean;
    }>;
    /**
     * Provisions the tenant ecosystem:
     *   a) Create TenantEntity (identity-service)
     *   b) Create SubscriptionEntity (saas-platform-service)
     *   c) Create UserEntity — the tenant admin (identity-service)
     *   d) Create IdentityEntity — admin credentials (identity-service)
     *   e) Set tenant status → 'trial' (already default)
     *   f) Issue access tokens for immediate auto-login
     *   g) Clean up registration record
     *   h) Emit completion events
     *
     * On any failure: attempt rollback, emit ONBOARDING_FAILED event.
     */
    complete(dto: CompleteOnboardingDto): Promise<{
        tenantId: string;
        accessToken: string;
        refreshToken: string;
        redirectTo: string;
    }>;
    checkSlugAvailability(slug: string): Promise<{
        available: boolean;
    }>;
    getRegistrationStatus(registrationId: string): Promise<{
        step: number;
        emailVerified: boolean;
        hasPackage: boolean;
    }>;
    private requireRegistration;
    private requireEmailVerified;
    private assertPackageActive;
    private fetchPackage;
    private createSubscription;
}
//# sourceMappingURL=onboarding.service.d.ts.map