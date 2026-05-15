"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const tenant_module_1 = require("../tenant/tenant.module");
const user_module_1 = require("../user/user.module");
const auth_module_1 = require("../auth/auth.module");
const identity_module_1 = require("../identity/identity.module");
const onboarding_controller_1 = require("./controllers/onboarding.controller");
const onboarding_service_1 = require("./services/onboarding.service");
const onboarding_token_service_1 = require("./services/onboarding-token.service");
let OnboardingModule = class OnboardingModule {
};
exports.OnboardingModule = OnboardingModule;
exports.OnboardingModule = OnboardingModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule.register({
                timeout: 5_000,
                maxRedirects: 0,
            }),
            tenant_module_1.TenantModule,
            user_module_1.UserModule,
            auth_module_1.AuthModule,
            identity_module_1.IdentityModule,
        ],
        controllers: [onboarding_controller_1.OnboardingController],
        providers: [onboarding_service_1.OnboardingService, onboarding_token_service_1.OnboardingTokenService],
    })
], OnboardingModule);
//# sourceMappingURL=onboarding.module.js.map