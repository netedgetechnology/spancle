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
exports.SportController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const sport_service_1 = require("../services/sport.service");
const create_sport_dto_1 = require("../dto/create-sport.dto");
/**
 * SportController — sport management endpoints.
 *
 * All routes are behind the global guard chain:
 *   TenantGuard → JwtAuthGuard → TenantStatusGuard
 *
 * Write operations require TENANT_ADMIN or TENANT_MANAGER role.
 * Read operations are open to all authenticated tenant users.
 *
 * Routes:
 *   POST   /api/v1/sports
 *   GET    /api/v1/sports                       ?status=active|inactive
 *   GET    /api/v1/sports/status-summary
 *   GET    /api/v1/sports/by-slug/:slug
 *   GET    /api/v1/sports/by-branch/:branchId
 *   GET    /api/v1/sports/:id
 *   PATCH  /api/v1/sports/:id
 *   PATCH  /api/v1/sports/:id/status
 *   PATCH  /api/v1/sports/:id/branches
 *   DELETE /api/v1/sports/:id
 */
let SportController = class SportController {
    constructor(sportService) {
        this.sportService = sportService;
    }
    // ── Write ──────────────────────────────────────────────────────────────────
    create(dto, tenant, actorId) {
        return this.sportService.create(dto, tenant.tenantId, actorId);
    }
    update(id, dto, tenant, actorId) {
        return this.sportService.update(id, dto, tenant.tenantId, actorId);
    }
    /**
     * PATCH /sports/:id/status
     * Dedicated status transition — explicit and auditable.
     */
    updateStatus(id, dto, tenant, actorId) {
        return this.sportService.updateStatus(id, dto, tenant.tenantId, actorId);
    }
    /**
     * PATCH /sports/:id/branches
     * Replaces the full set of branch mappings for this sport.
     * Pass { branchIds: [] } to remove all mappings.
     */
    assignBranches(id, dto, tenant, actorId) {
        return this.sportService.assignBranches(id, dto, tenant.tenantId, actorId);
    }
    remove(id, tenant, actorId) {
        return this.sportService.remove(id, tenant.tenantId, actorId);
    }
    // ── Read ───────────────────────────────────────────────────────────────────
    findAll(tenant, status) {
        return this.sportService.findAll(tenant.tenantId, status);
    }
    /**
     * GET /sports/status-summary
     * Returns { active: N, inactive: N } — declared before /:id to avoid shadowing.
     */
    getStatusSummary(tenant) {
        return this.sportService.getStatusSummary(tenant.tenantId);
    }
    findBySlug(slug, tenant) {
        return this.sportService.findBySlug(slug, tenant.tenantId);
    }
    /**
     * GET /sports/by-branch/:branchId
     * Returns all active sports mapped to a specific branch.
     */
    findByBranch(branchId, tenant) {
        return this.sportService.findByBranch(branchId, tenant.tenantId);
    }
    findOne(id, tenant) {
        return this.sportService.findOne(id, tenant.tenantId);
    }
};
exports.SportController = SportController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_sport_dto_1.CreateSportDto, Object, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_sport_dto_1.UpdateSportDto, Object, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_sport_dto_1.SportStatusDto, Object, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/branches'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_sport_dto_1.AssignBranchesDto, Object, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "assignBranches", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('status-summary'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "getStatusSummary", null);
__decorate([
    (0, common_1.Get)('by-slug/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.Get)('by-branch/:branchId'),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "findByBranch", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], SportController.prototype, "findOne", null);
exports.SportController = SportController = __decorate([
    (0, common_1.Controller)('sports'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [sport_service_1.SportService])
], SportController);
//# sourceMappingURL=sport.controller.js.map