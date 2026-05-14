import { OnboardingService } from '../services/onboarding.service';
import { SignupDto, VerifyEmailDto, SelectPackageDto, CompleteOnboardingDto, ResendVerificationDto, CheckSlugDto } from '../dto/onboarding.dto';
/**
 * OnboardingController — public onboarding flow endpoints.
 *
 * ALL routes are decorated @Public() — they bypass JwtAuthGuard,
 * TenantGuard, TenantStatusGuard, PlanLimitGuard, RolesGuard, PermissionsGuard.
 *
 * Rate limiting is applied per-endpoint (stricter than the global default):
 *   - signup:       5 requests / 60s per IP
 *   - verify:       10 requests / 60s per IP
 *   - resend:       3 requests / 60s per IP
 *   - package:      20 requests / 60s per IP
 *   - complete:     5 requests / 60s per IP
 *   - slug-check:   30 requests / 60s per IP
 *
 * Routes:
 *   POST /api/v1/onboarding/signup
 *   POST /api/v1/onboarding/verify-email
 *   POST /api/v1/onboarding/resend-verification
 *   POST /api/v1/onboarding/select-package
 *   POST /api/v1/onboarding/complete
 *   GET  /api/v1/onboarding/status/:registrationId
 *   GET  /api/v1/onboarding/check-slug
 *   GET  /api/v1/onboarding/packages        (active packages for selector)
 */
export declare class OnboardingController {
    private readonly onboardingService;
    constructor(onboardingService: OnboardingService);
    /**
     * POST /api/v1/onboarding/signup
     * Initiates onboarding. Sends verification email. Returns registrationId.
     */
    signup(dto: SignupDto): Promise<{
        registrationId: string;
        maskedEmail: string;
    }>;
    /**
     * POST /api/v1/onboarding/verify-email
     * Validates the email verification token (single-use).
     */
    verifyEmail(dto: VerifyEmailDto): Promise<{
        verified: boolean;
    }>;
    /**
     * POST /api/v1/onboarding/resend-verification
     * Generates a new token and re-sends the verification email.
     */
    resendVerification(dto: ResendVerificationDto): Promise<{
        sent: boolean;
    }>;
    /**
     * POST /api/v1/onboarding/select-package
     * Records the tenant's chosen package.
     */
    selectPackage(dto: SelectPackageDto): Promise<{
        recorded: boolean;
    }>;
    /**
     * POST /api/v1/onboarding/complete
     * Provisions the full tenant ecosystem and returns access tokens.
     */
    complete(dto: CompleteOnboardingDto): Promise<{
        tenantId: string;
        accessToken: string;
        refreshToken: string;
        redirectTo: string;
    }>;
    /**
     * GET /api/v1/onboarding/status/:registrationId
     * Returns current step, email verified state, and package selection state.
     * Used by the frontend to recover state on page refresh.
     */
    getStatus(registrationId: string): Promise<{
        step: number;
        emailVerified: boolean;
        hasPackage: boolean;
    }>;
    /**
     * GET /api/v1/onboarding/check-slug?slug=acme-fc
     * Checks real-time slug availability (DB + Redis pending registrations).
     */
    checkSlug(query: CheckSlugDto): Promise<{
        available: boolean;
    }>;
}
//# sourceMappingURL=onboarding.controller.d.ts.map