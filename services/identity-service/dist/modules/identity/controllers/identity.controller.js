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
exports.IdentityController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const identity_guard_1 = require("../guards/identity.guard");
const identity_service_1 = require("../services/identity.service");
const create_identity_dto_1 = require("../dto/create-identity.dto");
const update_identity_dto_1 = require("../dto/update-identity.dto");
let IdentityController = class IdentityController {
    constructor(identityService) {
        this.identityService = identityService;
    }
    async login(dto, tenant) {
        return this.identityService.login(dto, tenant.tenantId);
    }
    async refresh(dto, tenant) {
        return this.identityService.refreshToken(dto, tenant.tenantId);
    }
    async logout(dto, tenant) {
        return this.identityService.logout(dto.refreshToken, tenant.tenantId);
    }
};
exports.IdentityController = IdentityController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_identity_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_identity_dto_1.RefreshTokenDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_identity_dto_1.RefreshTokenDto, Object]),
    __metadata("design:returntype", Promise)
], IdentityController.prototype, "logout", null);
exports.IdentityController = IdentityController = __decorate([
    (0, common_1.Controller)('auth'),
    (0, common_1.UseGuards)(identity_guard_1.TenantGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [identity_service_1.IdentityService])
], IdentityController);
//# sourceMappingURL=identity.controller.js.map