"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OnboardingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const axios_1 = require("@nestjs/axios");
const config_1 = require("@nestjs/config");
const rxjs_1 = require("rxjs");
const tenant_service_1 = require("../../tenant/services/tenant.service");
const user_service_1 = require("../../user/services/user.service");
const password_service_1 = require("../../auth/services/password.service");
const token_service_1 = require("../../auth/services/token.service");
const identity_repository_1 = require("../../identity/repositories/identity.repository");
const tenant_repository_1 = require("../../tenant/repositories/tenant.repository");
const onboarding_token_service_1 = require("./onboarding-token.service");
const onboarding_events_1 = require("../events/onboarding.events");
const utils_1 = require("@spancle/utils");
let OnboardingService = OnboardingService_1 = class OnboardingService {
    constructor(tokenService, tenantService, userService, passwordService, jwtTokenService, identityRepository, tenantRepository, eventEmitter, httpService, config) {
        this.tokenService = tokenService;
        this.tenantService = tenantService;
        this.userService = userService;
        this.passwordService = passwordService;
        this.jwtTokenService = jwtTokenService;
        this.identityRepository = identityRepository;
        this.tenantRepository = tenantRepository;
        this.eventEmitter = eventEmitter;
        this.httpService = httpService;
        this.config = config;
        this.logger = new common_1.Logger(OnboardingService_1.name);
    }
    async signup(dto) {
        if (await this.tokenService.isSlugReserved(dto.slug)) {
            throw new common_1.ConflictException(`The subdomain "${dto.slug}" is already taken`);
        }
        const existingBySlug = await this.tenantRepository.findBySlug(dto.slug);
        if (existingBySlug) {
            throw new common_1.ConflictException(`The subdomain "${dto.slug}" is already taken`);
        }
        const pendingId = await this.tokenService.isEmailPendingRegistration(dto.email);
        if (pendingId) {
            this.logger.log(`Email ${(0, utils_1.maskEmail)(dto.email)} has a pending registration: ${pendingId}`);
            return { registrationId: pendingId, maskedEmail: (0, utils_1.maskEmail)(dto.email) };
        }
        const existingByEmail = await this.tenantRepository.findByEmail(dto.email);
        if (existingByEmail) {
            this.logger.warn(`Signup attempt for existing tenant email: ${(0, utils_1.maskEmail)(dto.email)}`);
            throw new common_1.ConflictException('An account with this email already exists. Please sign in or use a different email.');
        }
        const registration = await this.tokenService.createRegistration({
            fullName: dto.fullName,
            orgName: dto.orgName,
            slug: dto.slug,
            email: dto.email,
        });
        const token = await this.tokenService.generateVerificationToken(registration.registrationId);
        await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.EMAIL_VERIFICATION_SENT, {
            registrationId: registration.registrationId,
            email: dto.email,
            maskedEmail: (0, utils_1.maskEmail)(dto.email),
            verificationToken: token,
            verificationUrl: `${this.config.get('APP_URL')}/onboarding/verify?r=${registration.registrationId}&t=${token}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            timestamp: new Date().toISOString(),
        });
        await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.SIGNUP_INITIATED, {
            registrationId: registration.registrationId,
            email: dto.email,
            orgName: dto.orgName,
            slug: dto.slug,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Signup initiated: ${registration.registrationId} slug=${dto.slug}`);
        return {
            registrationId: registration.registrationId,
            maskedEmail: (0, utils_1.maskEmail)(dto.email),
        };
    }
    async verifyEmail(dto) {
        const registration = await this.requireRegistration(dto.registrationId);
        if (registration.emailVerified) {
            return { verified: true };
        }
        const valid = await this.tokenService.validateAndConsumeToken(dto.registrationId, dto.token);
        if (!valid) {
            throw new common_1.BadRequestException('Invalid or expired verification token. Request a new one and try again.');
        }
        await this.tokenService.updateRegistration(dto.registrationId, {
            emailVerified: true,
            step: 2,
        });
        await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.EMAIL_VERIFIED, {
            registrationId: dto.registrationId,
            email: registration.email,
            verifiedAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Email verified: ${dto.registrationId}`);
        return { verified: true };
    }
    async resendVerification(dto) {
        const registration = await this.requireRegistration(dto.registrationId);
        if (registration.emailVerified) {
            return { sent: false };
        }
        const token = await this.tokenService.generateVerificationToken(dto.registrationId);
        await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.EMAIL_VERIFICATION_SENT, {
            registrationId: dto.registrationId,
            email: registration.email,
            maskedEmail: (0, utils_1.maskEmail)(registration.email),
            verificationToken: token,
            verificationUrl: `${this.config.get('APP_URL')}/onboarding/verify?r=${dto.registrationId}&t=${token}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Verification email resent: ${dto.registrationId}`);
        return { sent: true };
    }
    async selectPackage(dto) {
        const registration = await this.requireRegistration(dto.registrationId);
        this.requireEmailVerified(registration);
        await this.assertPackageActive(dto.packageId);
        await this.tokenService.updateRegistration(dto.registrationId, {
            packageId: dto.packageId,
            billingCycle: dto.billingCycle ?? 'monthly',
            step: 3,
        });
        const pkg = await this.fetchPackage(dto.packageId);
        await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.PACKAGE_SELECTED, {
            registrationId: dto.registrationId,
            email: registration.email,
            packageId: dto.packageId,
            tierKey: pkg.tierKey,
            billingCycle: dto.billingCycle ?? 'monthly',
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Package selected: ${dto.registrationId} → ${dto.packageId}`);
        return { recorded: true };
    }
    async complete(dto) {
        const registration = await this.requireRegistration(dto.registrationId);
        this.requireEmailVerified(registration);
        if (!registration.packageId) {
            throw new common_1.BadRequestException('Please select a package before completing setup.');
        }
        if (dto.password !== dto.confirmPassword) {
            throw new common_1.BadRequestException('Password and confirmation do not match.');
        }
        this.passwordService.enforcePolicy(dto.password);
        const startedAt = Date.now();
        let tenantId = null;
        let subscriptionId = null;
        let userId = null;
        let identityId = null;
        try {
            const tenant = await this.tenantService.create({
                name: registration.orgName,
                slug: registration.slug,
                email: registration.email,
                tier: 'free',
                settings: {
                    timezone: dto.timezone ?? 'UTC',
                    currency: dto.currency ?? 'GBP',
                    locale: 'en-GB',
                    dateFormat: 'DD/MM/YYYY',
                    allowPublicBookings: false,
                    requireMfa: false,
                    maxSessionDurationMs: 28_800_000,
                },
            });
            tenantId = tenant.id;
            const subscription = await this.createSubscription(tenantId, registration.packageId, registration.billingCycle);
            subscriptionId = subscription.id;
            await this.tenantService.changeTier(tenantId, subscription.tierKey, 'onboarding');
            await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.TENANT_PROVISIONED, {
                registrationId: dto.registrationId,
                email: registration.email,
                tenantId,
                subscriptionId,
                tierKey: subscription.tierKey,
                timestamp: new Date().toISOString(),
            });
            const user = await this.userService.create({ name: registration.fullName }, tenantId);
            userId = user.id;
            const passwordHash = await this.passwordService.hash(dto.password);
            const identity = await this.identityRepository.create({
                tenantId,
                userId: user.id,
                email: registration.email,
                passwordHash,
                isActive: true,
                isEmailVerified: true,
                failedLoginAttempts: 0,
                lockedUntil: null,
                lastLoginAt: null,
                passwordChangedAt: new Date(),
            });
            identityId = identity.id;
            await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.ADMIN_CREATED, {
                registrationId: dto.registrationId,
                email: registration.email,
                tenantId,
                userId: user.id,
                identityId: identity.id,
                timestamp: new Date().toISOString(),
            });
            const issued = await this.jwtTokenService.issueTokenPair({
                identityId: identity.id,
                userId: user.id,
                tenantId,
                role: 'TENANT_ADMIN',
            }, {});
            await this.tokenService.deleteRegistration(dto.registrationId);
            const durationMs = Date.now() - startedAt;
            await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.ONBOARDING_COMPLETED, {
                registrationId: dto.registrationId,
                email: registration.email,
                tenantId,
                userId: user.id,
                subscriptionId,
                durationMs,
                timestamp: new Date().toISOString(),
            });
            this.logger.log(`Onboarding completed: tenant=${tenantId} user=${user.id} ${durationMs}ms`);
            return {
                tenantId,
                accessToken: issued.tokens.accessToken,
                refreshToken: issued.tokens.refreshToken,
                redirectTo: `/dashboard`,
            };
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : String(error);
            this.logger.error(`Onboarding provisioning failed: ${errMsg}`, { dto: dto.registrationId });
            const failedStep = !tenantId ? 'tenant_creation'
                : !subscriptionId ? 'subscription_creation'
                    : !userId ? 'user_creation'
                        : 'identity_creation';
            if (tenantId && !subscriptionId) {
                try {
                    await this.tenantRepository.updateStatus(tenantId, 'pending');
                }
                catch (rollbackErr) {
                    this.logger.error(`Rollback failed for tenant ${tenantId}: ${String(rollbackErr)}`);
                }
            }
            await this.eventEmitter.emitAsync(onboarding_events_1.OnboardingEventNames.ONBOARDING_FAILED, {
                registrationId: dto.registrationId,
                email: registration.email,
                step: failedStep,
                reason: errMsg,
                timestamp: new Date().toISOString(),
            });
            throw new common_1.UnprocessableEntityException(`Provisioning failed at step "${failedStep}". Our team has been notified. ` +
                'Please try again or contact support.');
        }
    }
    async checkSlugAvailability(slug) {
        const reservedInCache = await this.tokenService.isSlugReserved(slug);
        if (reservedInCache)
            return { available: false };
        const existingInDb = await this.tenantRepository.findBySlug(slug);
        return { available: !existingInDb };
    }
    async getRegistrationStatus(registrationId) {
        const reg = await this.tokenService.getRegistration(registrationId);
        if (!reg)
            throw new common_1.NotFoundException('Registration not found or expired');
        return {
            step: reg.step,
            emailVerified: reg.emailVerified,
            hasPackage: !!reg.packageId,
        };
    }
    async requireRegistration(registrationId) {
        const reg = await this.tokenService.getRegistration(registrationId);
        if (!reg) {
            throw new common_1.NotFoundException('Registration not found or expired. Please start the signup process again.');
        }
        return reg;
    }
    requireEmailVerified(registration) {
        if (!registration.emailVerified) {
            throw new common_1.BadRequestException('Email address must be verified before continuing. ' +
                'Check your inbox for the verification link.');
        }
    }
    async assertPackageActive(packageId) {
        const pkg = await this.fetchPackage(packageId);
        if (pkg.status !== 'active') {
            throw new common_1.BadRequestException(`Package is not available for new subscriptions`);
        }
    }
    async fetchPackage(packageId) {
        const saasBase = this.config.get('SAAS_PLATFORM_URL', 'http://localhost:3002');
        try {
            const res = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${saasBase}/api/v1/packages/${packageId}`, {
                timeout: 5000,
                headers: { 'x-internal-service': 'identity-service' },
            }));
            return res.data;
        }
        catch {
            throw new common_1.BadRequestException('Unable to validate the selected package. Please try again.');
        }
    }
    async createSubscription(tenantId, packageId, billingCycle) {
        const saasBase = this.config.get('SAAS_PLATFORM_URL', 'http://localhost:3002');
        const res = await (0, rxjs_1.firstValueFrom)(this.httpService.post(`${saasBase}/api/v1/subscriptions`, { packageId, billingCycle }, {
            timeout: 5000,
            headers: {
                'x-tenant-id': tenantId,
                'x-internal-service': 'identity-service',
            },
        }));
        return res.data;
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = OnboardingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [onboarding_token_service_1.OnboardingTokenService,
        tenant_service_1.TenantService,
        user_service_1.UserService,
        password_service_1.PasswordService,
        token_service_1.TokenService,
        identity_repository_1.IdentityRepository,
        tenant_repository_1.TenantRepository,
        event_emitter_1.EventEmitter2,
        axios_1.HttpService,
        config_1.ConfigService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map