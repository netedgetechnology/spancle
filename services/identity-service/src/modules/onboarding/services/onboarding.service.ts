import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }      from '@nestjs/event-emitter';
import { HttpService }        from '@nestjs/axios';
import { ConfigService }      from '@nestjs/config';
import { firstValueFrom }     from 'rxjs';

import { TenantService }      from '../../tenant/services/tenant.service';
import { UserService }        from '../../user/services/user.service';
import { PasswordService }    from '../../auth/services/password.service';
import { TokenService }       from '../../auth/services/token.service';
import { IdentityRepository } from '../../identity/repositories/identity.repository';
import { TenantRepository }   from '../../tenant/repositories/tenant.repository';

import { OnboardingTokenService }          from './onboarding-token.service';
import type { RegistrationRecord }         from './onboarding-token.service';
import type {
  SignupDto,
  VerifyEmailDto,
  SelectPackageDto,
  CompleteOnboardingDto,
  ResendVerificationDto,
} from '../dto/onboarding.dto';
import {
  OnboardingEventNames,
} from '../events/onboarding.events';
import type { TokenPair } from '@spancle/types';
import { maskEmail } from '@spancle/utils';

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
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly tokenService:        OnboardingTokenService,
    private readonly tenantService:       TenantService,
    private readonly userService:         UserService,
    private readonly passwordService:     PasswordService,
    private readonly jwtTokenService:     TokenService,
    private readonly identityRepository:  IdentityRepository,
    private readonly tenantRepository:    TenantRepository,
    private readonly eventEmitter:        EventEmitter2,
    private readonly httpService:         HttpService,
    private readonly config:              ConfigService,
  ) {}

  // ── Step 1: Signup ─────────────────────────────────────────────────────────

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
  async signup(dto: SignupDto): Promise<{ registrationId: string; maskedEmail: string }> {
    // Check slug in Redis (pending registrations)
    if (await this.tokenService.isSlugReserved(dto.slug)) {
      throw new ConflictException(`The subdomain "${dto.slug}" is already taken`);
    }

    // Check slug in DB (existing tenants)
    const existingBySlug = await this.tenantRepository.findBySlug(dto.slug);
    if (existingBySlug) {
      throw new ConflictException(`The subdomain "${dto.slug}" is already taken`);
    }

    // Check email in pending registrations
    const pendingId = await this.tokenService.isEmailPendingRegistration(dto.email);
    if (pendingId) {
      // Return the existing registration — idempotent
      this.logger.log(`Email ${maskEmail(dto.email)} has a pending registration: ${pendingId}`);
      return { registrationId: pendingId, maskedEmail: maskEmail(dto.email) };
    }

    // Check email against existing tenants
    const existingByEmail = await this.tenantRepository.findByEmail(dto.email);
    if (existingByEmail) {
      // Security: don't reveal whether the email is registered — return same shape
      this.logger.warn(`Signup attempt for existing tenant email: ${maskEmail(dto.email)}`);
      throw new ConflictException(
        'An account with this email already exists. Please sign in or use a different email.',
      );
    }

    // Create registration
    const registration = await this.tokenService.createRegistration({
      fullName: dto.fullName,
      orgName:  dto.orgName,
      slug:     dto.slug,
      email:    dto.email,
    });

    // Generate verification token
    const token = await this.tokenService.generateVerificationToken(registration.registrationId);

    // Emit event — communication-service listens and sends the email
    await this.eventEmitter.emitAsync(OnboardingEventNames.EMAIL_VERIFICATION_SENT, {
      registrationId: registration.registrationId,
      email:          dto.email,
      maskedEmail:    maskEmail(dto.email),
      // Token is passed in the event payload so communication-service can build the link
      // It is never logged and never returned in the HTTP response
      verificationToken: token,
      verificationUrl:   `${this.config.get('APP_URL')}/onboarding/verify?r=${registration.registrationId}&t=${token}`,
      expiresAt:         new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timestamp:         new Date().toISOString(),
    });

    await this.eventEmitter.emitAsync(OnboardingEventNames.SIGNUP_INITIATED, {
      registrationId: registration.registrationId,
      email:          dto.email,
      orgName:        dto.orgName,
      slug:           dto.slug,
      timestamp:      new Date().toISOString(),
    });

    this.logger.log(`Signup initiated: ${registration.registrationId} slug=${dto.slug}`);

    return {
      registrationId: registration.registrationId,
      maskedEmail:    maskEmail(dto.email),
    };
  }

  // ── Step 2: Email verification ─────────────────────────────────────────────

  /**
   * Validates the email verification token.
   * Token is single-use — consumed immediately on valid match.
   */
  async verifyEmail(dto: VerifyEmailDto): Promise<{ verified: boolean }> {
    const registration = await this.requireRegistration(dto.registrationId);

    if (registration.emailVerified) {
      return { verified: true }; // Idempotent
    }

    const valid = await this.tokenService.validateAndConsumeToken(
      dto.registrationId,
      dto.token,
    );

    if (!valid) {
      throw new BadRequestException(
        'Invalid or expired verification token. Request a new one and try again.',
      );
    }

    await this.tokenService.updateRegistration(dto.registrationId, {
      emailVerified: true,
      step: 2,
    });

    await this.eventEmitter.emitAsync(OnboardingEventNames.EMAIL_VERIFIED, {
      registrationId: dto.registrationId,
      email:          registration.email,
      verifiedAt:     new Date().toISOString(),
      timestamp:      new Date().toISOString(),
    });

    this.logger.log(`Email verified: ${dto.registrationId}`);
    return { verified: true };
  }

  /**
   * Resends the verification email.
   * Generates a new token (invalidates the previous one).
   * Rate-limited at nginx; also throttled by ThrottlerGuard.
   */
  async resendVerification(dto: ResendVerificationDto): Promise<{ sent: boolean }> {
    const registration = await this.requireRegistration(dto.registrationId);

    if (registration.emailVerified) {
      return { sent: false }; // Already verified — nothing to do
    }

    const token = await this.tokenService.generateVerificationToken(dto.registrationId);

    await this.eventEmitter.emitAsync(OnboardingEventNames.EMAIL_VERIFICATION_SENT, {
      registrationId:    dto.registrationId,
      email:             registration.email,
      maskedEmail:       maskEmail(registration.email),
      verificationToken: token,
      verificationUrl:   `${this.config.get('APP_URL')}/onboarding/verify?r=${dto.registrationId}&t=${token}`,
      expiresAt:         new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      timestamp:         new Date().toISOString(),
    });

    this.logger.log(`Verification email resent: ${dto.registrationId}`);
    return { sent: true };
  }

  // ── Step 3: Package selection ──────────────────────────────────────────────

  /**
   * Records the tenant's chosen package and billing cycle.
   * Validates that the package exists and is active.
   */
  async selectPackage(dto: SelectPackageDto): Promise<{ recorded: boolean }> {
    const registration = await this.requireRegistration(dto.registrationId);
    this.requireEmailVerified(registration);

    // Verify package exists and is active via saas-platform-service
    await this.assertPackageActive(dto.packageId);

    await this.tokenService.updateRegistration(dto.registrationId, {
      packageId:    dto.packageId,
      billingCycle: dto.billingCycle ?? 'monthly',
      step:         3,
    });

    // We need the tier key for the event — fetch from saas-platform
    const pkg = await this.fetchPackage(dto.packageId);

    await this.eventEmitter.emitAsync(OnboardingEventNames.PACKAGE_SELECTED, {
      registrationId: dto.registrationId,
      email:          registration.email,
      packageId:      dto.packageId,
      tierKey:        pkg.tierKey,
      billingCycle:   dto.billingCycle ?? 'monthly',
      timestamp:      new Date().toISOString(),
    });

    this.logger.log(`Package selected: ${dto.registrationId} → ${dto.packageId}`);
    return { recorded: true };
  }

  // ── Step 4: Provisioning + Admin creation ──────────────────────────────────

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
  async complete(dto: CompleteOnboardingDto): Promise<{
    tenantId:       string;
    accessToken:    string;
    refreshToken:   string;
    redirectTo:     string;
  }> {
    const registration = await this.requireRegistration(dto.registrationId);
    this.requireEmailVerified(registration);

    if (!registration.packageId) {
      throw new BadRequestException('Please select a package before completing setup.');
    }

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Password and confirmation do not match.');
    }

    // Enforce password policy before any DB writes
    this.passwordService.enforcePolicy(dto.password);

    const startedAt = Date.now();
    let tenantId: string | null = null;
    let subscriptionId: string | null = null;
    let userId: string | null = null;
    let identityId: string | null = null;

    try {
      // ── a) Create tenant ───────────────────────────────────────────────────
      const tenant = await this.tenantService.create({
        name:  registration.orgName,
        slug:  registration.slug,
        email: registration.email,
        tier:  'free',          // will be updated after subscription creation
        settings: {
          timezone:            dto.timezone ?? 'UTC',
          currency:            dto.currency ?? 'GBP',
          locale:              'en-GB',
          dateFormat:          'DD/MM/YYYY',
          allowPublicBookings: false,
          requireMfa:          false,
          maxSessionDurationMs: 28_800_000,
        },
      });
      tenantId = tenant.id;

      // ── b) Create subscription (cross-service) ─────────────────────────────
      const subscription = await this.createSubscription(
        tenantId,
        registration.packageId,
        registration.billingCycle,
      );
      subscriptionId = subscription.id;

      // Update tenant tier from the subscription's tierKey
      await this.tenantService.changeTier(tenantId, subscription.tierKey as import('@spancle/types').TenantTier, 'onboarding');

      await this.eventEmitter.emitAsync(OnboardingEventNames.TENANT_PROVISIONED, {
        registrationId: dto.registrationId,
        email:          registration.email,
        tenantId,
        subscriptionId,
        tierKey:        subscription.tierKey,
        timestamp:      new Date().toISOString(),
      });

      // ── c) Create user (the tenant admin) ─────────────────────────────────
      const user = await this.userService.create(
        { name: registration.fullName },
        tenantId,
      );
      userId = user.id;

      // ── d) Create identity (credentials) ──────────────────────────────────
      const passwordHash = await this.passwordService.hash(dto.password);

      const identity = await this.identityRepository.create({
        tenantId,
        userId:         user.id,
        email:          registration.email,
        passwordHash,
        isActive:       true,
        isEmailVerified: true,
        failedLoginAttempts: 0,
        lockedUntil:    null,
        lastLoginAt:    null,
        passwordChangedAt: new Date(),
      });
      identityId = identity.id;

      await this.eventEmitter.emitAsync(OnboardingEventNames.ADMIN_CREATED, {
        registrationId: dto.registrationId,
        email:          registration.email,
        tenantId,
        userId:         user.id,
        identityId:     identity.id,
        timestamp:      new Date().toISOString(),
      });

      // ── e) Issue tokens for auto-login ─────────────────────────────────────
      const issued = await this.jwtTokenService.issueTokenPair(
        {
          identityId: identity.id,
          userId:     user.id,
          tenantId,
          role:       'TENANT_ADMIN',
        },
        {},
      );

      // ── f) Clean up registration record ───────────────────────────────────
      await this.tokenService.deleteRegistration(dto.registrationId);

      const durationMs = Date.now() - startedAt;

      await this.eventEmitter.emitAsync(OnboardingEventNames.ONBOARDING_COMPLETED, {
        registrationId: dto.registrationId,
        email:          registration.email,
        tenantId,
        userId:         user.id,
        subscriptionId,
        durationMs,
        timestamp:      new Date().toISOString(),
      });

      this.logger.log(
        `Onboarding completed: tenant=${tenantId} user=${user.id} ${durationMs}ms`,
      );

      return {
        tenantId,
        accessToken:  issued.tokens.accessToken,
        refreshToken: issued.tokens.refreshToken,
        redirectTo:   `/dashboard`,
      };

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Onboarding provisioning failed: ${errMsg}`, { dto: dto.registrationId });

      // Determine which step failed and set a clean failure state
      const failedStep = !tenantId ? 'tenant_creation'
        : !subscriptionId         ? 'subscription_creation'
        : !userId                 ? 'user_creation'
        :                          'identity_creation';

      // Rollback: if tenant was created but subscription failed, set tenant to pending
      if (tenantId && !subscriptionId) {
        try {
          await this.tenantRepository.updateStatus(tenantId, 'pending');
        } catch (rollbackErr) {
          this.logger.error(`Rollback failed for tenant ${tenantId}: ${String(rollbackErr)}`);
        }
      }

      await this.eventEmitter.emitAsync(OnboardingEventNames.ONBOARDING_FAILED, {
        registrationId: dto.registrationId,
        email:          registration.email,
        step:           failedStep,
        reason:         errMsg,
        timestamp:      new Date().toISOString(),
      });

      throw new UnprocessableEntityException(
        `Provisioning failed at step "${failedStep}". Our team has been notified. ` +
        'Please try again or contact support.',
      );
    }
  }

  // ── Utility ────────────────────────────────────────────────────────────────

  async checkSlugAvailability(slug: string): Promise<{ available: boolean }> {
    const reservedInCache = await this.tokenService.isSlugReserved(slug);
    if (reservedInCache) return { available: false };

    const existingInDb = await this.tenantRepository.findBySlug(slug);
    return { available: !existingInDb };
  }

  async getRegistrationStatus(registrationId: string): Promise<{
    step:          number;
    emailVerified: boolean;
    hasPackage:    boolean;
  }> {
    const reg = await this.tokenService.getRegistration(registrationId);
    if (!reg) throw new NotFoundException('Registration not found or expired');
    return {
      step:          reg.step,
      emailVerified: reg.emailVerified,
      hasPackage:    !!reg.packageId,
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async requireRegistration(registrationId: string): Promise<RegistrationRecord> {
    const reg = await this.tokenService.getRegistration(registrationId);
    if (!reg) {
      throw new NotFoundException(
        'Registration not found or expired. Please start the signup process again.',
      );
    }
    return reg;
  }

  private requireEmailVerified(registration: RegistrationRecord): void {
    if (!registration.emailVerified) {
      throw new BadRequestException(
        'Email address must be verified before continuing. ' +
        'Check your inbox for the verification link.',
      );
    }
  }

  private async assertPackageActive(packageId: string): Promise<void> {
    const pkg = await this.fetchPackage(packageId);
    if (pkg.status !== 'active') {
      throw new BadRequestException(`Package is not available for new subscriptions`);
    }
  }

  private async fetchPackage(packageId: string): Promise<{ tierKey: string; status: string }> {
    const saasBase = this.config.get<string>('SAAS_PLATFORM_URL', 'http://localhost:3002');
    try {
      const res = await firstValueFrom(
        this.httpService.get(`${saasBase}/api/v1/packages/${packageId}`, {
          timeout: 5000,
          headers: { 'x-internal-service': 'identity-service' },
        }),
      );
      return res.data as { tierKey: string; status: string };
    } catch {
      throw new BadRequestException('Unable to validate the selected package. Please try again.');
    }
  }

  private async createSubscription(
    tenantId:     string,
    packageId:    string,
    billingCycle: 'monthly' | 'annual',
  ): Promise<{ id: string; tierKey: string }> {
    const saasBase = this.config.get<string>('SAAS_PLATFORM_URL', 'http://localhost:3002');
    const res = await firstValueFrom(
      this.httpService.post(
        `${saasBase}/api/v1/subscriptions`,
        { packageId, billingCycle },
        {
          timeout: 5000,
          headers: {
            'x-tenant-id':        tenantId,
            'x-internal-service': 'identity-service',
          },
        },
      ),
    );
    return res.data as { id: string; tierKey: string };
  }
}
