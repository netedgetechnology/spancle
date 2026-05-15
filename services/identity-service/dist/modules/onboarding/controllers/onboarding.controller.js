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
let OnboardingController = class OnboardingController {
    constructor(onboardingService) {
        this.onboardingService = onboardingService;
    }
    signup(dto) {
        return this.onboardingService.signup(dto);
    }
    verifyEmail(dto) {
        return this.onboardingService.verifyEmail(dto);
    }
    resendVerification(dto) {
        return this.onboardingService.resendVerification(dto);
    }
    selectPackage(dto) {
        return this.onboardingService.selectPackage(dto);
    }
    complete(dto) {
        return this.onboardingService.complete(dto);
    }
    getStatus(registrationId) {
        return this.onboardingService.getRegistrationStatus(registrationId);
    }
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