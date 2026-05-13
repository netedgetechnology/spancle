import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle }           from '@nestjs/throttler';
import { AuditInterceptor }   from '../../../common/interceptors/audit.interceptor';
import { Public }             from '../../../common/decorators/roles.decorator';
import { OnboardingService }  from '../services/onboarding.service';
import {
  SignupDto,
  VerifyEmailDto,
  SelectPackageDto,
  CompleteOnboardingDto,
  ResendVerificationDto,
  CheckSlugDto,
} from '../dto/onboarding.dto';

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
@Controller('onboarding')
@UseInterceptors(AuditInterceptor)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/onboarding/signup
   * Initiates onboarding. Sends verification email. Returns registrationId.
   */
  @Post('signup')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() dto: SignupDto): Promise<{
    registrationId: string;
    maskedEmail:    string;
  }> {
    return this.onboardingService.signup(dto);
  }

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/onboarding/verify-email
   * Validates the email verification token (single-use).
   */
  @Post('verify-email')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ verified: boolean }> {
    return this.onboardingService.verifyEmail(dto);
  }

  /**
   * POST /api/v1/onboarding/resend-verification
   * Generates a new token and re-sends the verification email.
   */
  @Post('resend-verification')
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto): Promise<{ sent: boolean }> {
    return this.onboardingService.resendVerification(dto);
  }

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/onboarding/select-package
   * Records the tenant's chosen package.
   */
  @Post('select-package')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  selectPackage(@Body() dto: SelectPackageDto): Promise<{ recorded: boolean }> {
    return this.onboardingService.selectPackage(dto);
  }

  // ── Step 4 ─────────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/onboarding/complete
   * Provisions the full tenant ecosystem and returns access tokens.
   */
  @Post('complete')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  complete(@Body() dto: CompleteOnboardingDto): Promise<{
    tenantId:     string;
    accessToken:  string;
    refreshToken: string;
    redirectTo:   string;
  }> {
    return this.onboardingService.complete(dto);
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/onboarding/status/:registrationId
   * Returns current step, email verified state, and package selection state.
   * Used by the frontend to recover state on page refresh.
   */
  @Get('status/:registrationId')
  @Public()
  getStatus(@Param('registrationId') registrationId: string): Promise<{
    step:          number;
    emailVerified: boolean;
    hasPackage:    boolean;
  }> {
    return this.onboardingService.getRegistrationStatus(registrationId);
  }

  /**
   * GET /api/v1/onboarding/check-slug?slug=acme-fc
   * Checks real-time slug availability (DB + Redis pending registrations).
   */
  @Get('check-slug')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  checkSlug(@Query() query: CheckSlugDto): Promise<{ available: boolean }> {
    return this.onboardingService.checkSlugAvailability(query.slug);
  }
}
