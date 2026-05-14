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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const onboarding_service_1 = require("../services/onboarding.service");
const onboarding_dto_1 = require("../dto/onboarding.dto");
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
let OnboardingController = class OnboardingController {
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    // ── Step 1 ─────────────────────────────────────────────────────────────────
    /**
     * POST /api/v1/onboarding/signup
     * Initiates onboarding. Sends verification email. Returns registrationId.
     */
    signup(dto) {
        return this.onboardingService.signup(dto);
    }
    // ── Step 2 ─────────────────────────────────────────────────────────────────
    /**
     * POST /api/v1/onboarding/verify-email
     * Validates the email verification token (single-use).
     */
    verifyEmail(dto) {
        return this.onboardingService.verifyEmail(dto);
    }
    /**
     * POST /api/v1/onboarding/resend-verification
     * Generates a new token and re-sends the verification email.
     */
    resendVerification(dto) {
        return this.onboardingService.resendVerification(dto);
    }
    // ── Step 3 ─────────────────────────────────────────────────────────────────
    /**
     * POST /api/v1/onboarding/select-package
     * Records the tenant's chosen package.
     */
    selectPackage(dto) {
        return this.onboardingService.selectPackage(dto);
    }
    // ── Step 4 ─────────────────────────────────────────────────────────────────
    /**
     * POST /api/v1/onboarding/complete
     * Provisions the full tenant ecosystem and returns access tokens.
     */
    complete(dto) {
        return this.onboardingService.complete(dto);
    }
    // ── Utilities ──────────────────────────────────────────────────────────────
    /**
     * GET /api/v1/onboarding/status/:registrationId
     * Returns current step, email verified state, and package selection state.
     * Used by the frontend to recover state on page refresh.
     */
    getStatus(registrationId) {
        return this.onboardingService.getRegistrationStatus(registrationId);
    }
    /**
     * GET /api/v1/onboarding/check-slug?slug=acme-fc
     * Checks real-time slug availability (DB + Redis pending registrations).
     */
    checkSlug(query) {
        return this.onboardingService.checkSlugAvailability(query.slug);
    }
};
exports.OnboardingController = OnboardingController;
__decorate([
    (0, common_1.Post)('signup'),
    (0, roles_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "signup", null);
__decorate([
    (0, common_1.Post)('verify-email'),
    (0, roles_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.VerifyEmailDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "verifyEmail", null);
__decorate([
    (0, common_1.Post)('resend-verification'),
    (0, roles_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 3, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.ResendVerificationDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "resendVerification", null);
__decorate([
    (0, common_1.Post)('select-package'),
    (0, roles_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 20, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.SelectPackageDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "selectPackage", null);
__decorate([
    (0, common_1.Post)('complete'),
    (0, roles_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60_000 } }),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.CompleteOnboardingDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "complete", null);
__decorate([
    (0, common_1.Get)('status/:registrationId'),
    (0, roles_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('registrationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Get)('check-slug'),
    (0, roles_decorator_1.Public)(),
    (0, throttler_1.Throttle)({ default: { limit: 30, ttl: 60_000 } }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [onboarding_dto_1.CheckSlugDto]),
    __metadata("design:returntype", Promise)
], OnboardingController.prototype, "checkSlug", null);
exports.OnboardingController = OnboardingController = __decorate([
    (0, common_1.Controller)('onboarding'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [onboarding_service_1.OnboardingService])
], OnboardingController);
//# sourceMappingURL=onboarding.controller.js.map