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
exports.TenantController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const tenant_context_interceptor_1 = require("../../../common/interceptors/tenant-context.interceptor");
const jwt_auth_guard_1 = require("../../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../../common/guards/roles.guard");
const tenant_status_guard_1 = require("../guards/tenant-status.guard");
const plan_limit_guard_1 = require("../guards/plan-limit.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const tenant_service_1 = require("../services/tenant.service");
const create_tenant_dto_1 = require("../dto/create-tenant.dto");
/**
 * TenantController — tenant lifecycle management.
 *
 * Route groups:
 *   POST   /tenants          → SUPER_ADMIN only
 *   GET    /tenants          → SUPER_ADMIN only
 *   GET    /tenants/:id      → SUPER_ADMIN or self (own tenantId)
 *   PATCH  /tenants/:id      → SUPER_ADMIN or TENANT_ADMIN (own)
 *   PATCH  /tenants/:id/settings → TENANT_ADMIN (own)
 *   POST   /tenants/:id/activate   → SUPER_ADMIN only
 *   POST   /tenants/:id/suspend    → SUPER_ADMIN only
 *   POST   /tenants/:id/terminate  → SUPER_ADMIN only
 *   PATCH  /tenants/:id/tier → SUPER_ADMIN only
 *
 * Guards applied at class level:
 *   JwtAuthGuard → TenantStatusGuard → PlanLimitGuard
 * Additional guards (RolesGuard) applied per endpoint.
 */
let TenantController = class TenantController {
    constructor(tenantService) {
        this.tenantService = tenantService;
    }
    // ── Superadmin operations ─────────────────────────────────────────────────
    async createTenant(dto) {
        return this.tenantService.create(dto);
    }
    async listTenants(page, limit, status, tier) {
        return this.tenantService.findAll(page ? Number(page) : 1, limit ? Number(limit) : 20, status, tier);
    }
    async getTenant(id, user) {
        // TENANT_ADMIN can only view their own tenant
        if (user.role !== 'SUPER_ADMIN' && user.tenantId !== id) {
            // RolesGuard doesn't enforce scope — we do it here
            throw Object.assign(new Error('Forbidden'), { status: 403 });
        }
        return this.tenantService.getById(id);
    }
    async updateTenant(id, dto, user) {
        if (user.role !== 'SUPER_ADMIN' && user.tenantId !== id) {
            throw Object.assign(new Error('Forbidden'), { status: 403 });
        }
        return this.tenantService.update(id, dto);
    }
    async updateSettings(id, dto, user) {
        if (user.role !== 'SUPER_ADMIN' && user.tenantId !== id) {
            throw Object.assign(new Error('Forbidden'), { status: 403 });
        }
        return this.tenantService.updateSettings(id, dto.settings);
    }
    async activate(id, user) {
        return this.tenantService.activate(id, user.userId);
    }
    async suspend(id, dto, user) {
        return this.tenantService.suspend(id, user.userId, dto.reason);
    }
    async terminate(id, dto, user) {
        return this.tenantService.terminate(id, user.userId, dto.reason);
    }
    async changeTier(id, dto, user) {
        return this.tenantService.changeTier(id, dto.tier, user.userId);
    }
};
exports.TenantController = TenantController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_tenant_dto_1.CreateTenantDto]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "createTenant", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('tier')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "listTenants", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "getTenant", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_tenant_dto_1.UpdateTenantDto, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateTenant", null);
__decorate([
    (0, common_1.Patch)(':id/settings'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN', 'TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_tenant_dto_1.UpdateTenantSettingsDto, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Post)(':id/activate'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "activate", null);
__decorate([
    (0, common_1.Post)(':id/suspend'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_tenant_dto_1.TenantStatusTransitionDto, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "suspend", null);
__decorate([
    (0, common_1.Post)(':id/terminate'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_tenant_dto_1.TenantStatusTransitionDto, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "terminate", null);
__decorate([
    (0, common_1.Patch)(':id/tier'),
    (0, common_1.UseGuards)(roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SUPER_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_tenant_dto_1.ChangeTierDto, Object]),
    __metadata("design:returntype", Promise)
], TenantController.prototype, "changeTier", null);
exports.TenantController = TenantController = __decorate([
    (0, common_1.Controller)('tenants'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, tenant_status_guard_1.TenantStatusGuard, plan_limit_guard_1.PlanLimitGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor, tenant_context_interceptor_1.TenantContextInterceptor),
    __metadata("design:paramtypes", [tenant_service_1.TenantService])
], TenantController);
//# sourceMappingURL=tenant.controller.js.map