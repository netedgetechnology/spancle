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
exports.CourtController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const court_service_1 = require("../services/court.service");
const create_court_dto_1 = require("../dto/create-court.dto");
/**
 * CourtController — court / venue management endpoints.
 *
 * All routes protected by global guard chain:
 *   TenantGuard → JwtAuthGuard → TenantStatusGuard
 *
 * Write ops (create, update, generate, status, maintenance, delete):
 *   @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
 *
 * Delete:
 *   @Roles('TENANT_ADMIN') — elevated
 *
 * Read ops: all authenticated tenant users
 *
 * Routes:
 *   POST   /api/v1/courts                      create single
 *   POST   /api/v1/courts/generate             bulk generation
 *   GET    /api/v1/courts                      list (?branchId= &sportId= &status=)
 *   GET    /api/v1/courts/status-summary       { available:N, ... }
 *   GET    /api/v1/courts/by-branch/:branchId  all courts in a branch
 *   GET    /api/v1/courts/by-sport/:sportId    all courts for a sport
 *   GET    /api/v1/courts/:id                  single court
 *   PATCH  /api/v1/courts/:id                  update details
 *   PATCH  /api/v1/courts/:id/status           status transition
 *   PATCH  /api/v1/courts/:id/maintenance      set maintenance + reason
 *   DELETE /api/v1/courts/:id                  soft delete
 */
let CourtController = class CourtController {
    constructor(courtService) {
        this.courtService = courtService;
    }
    // ── Write ──────────────────────────────────────────────────────────────────
    create(dto, tenant, actorId) {
        return this.courtService.create(dto, tenant.tenantId, actorId);
    }
    /**
     * POST /courts/generate
     * Bulk-generates numbered courts with a shared prefix.
     * Transactional — rolls back completely on any failure.
     * Returns { courts, created, skipped }.
     */
    generateCourts(dto, tenant, actorId) {
        return this.courtService.generateCourts(dto, tenant.tenantId, actorId);
    }
    update(id, dto, tenant, actorId) {
        return this.courtService.update(id, dto, tenant.tenantId, actorId);
    }
    /**
     * PATCH /courts/:id/status
     * Dedicated status transition endpoint — auditable and explicit.
     * Validates allowed transitions. Clears maintenance fields on exit.
     */
    updateStatus(id, dto, tenant, actorId) {
        return this.courtService.updateStatus(id, dto, tenant.tenantId, actorId);
    }
    /**
     * PATCH /courts/:id/maintenance
     * Sets the court into maintenance with a required note.
     * Separate endpoint so maintenance reason is always captured.
     */
    setMaintenance(id, dto, tenant, actorId) {
        return this.courtService.setMaintenance(id, dto, tenant.tenantId, actorId);
    }
    remove(id, tenant, actorId) {
        return this.courtService.remove(id, tenant.tenantId, actorId);
    }
    // ── Read ───────────────────────────────────────────────────────────────────
    findAll(tenant, branchId, sportId, status) {
        if (sportId) {
            return this.courtService.findBySport(sportId, tenant.tenantId, branchId);
        }
        return this.courtService.findAll(tenant.tenantId, branchId, status);
    }
    /**
     * GET /courts/status-summary
     * Declared before /:id to avoid route shadowing.
     */
    getStatusSummary(tenant) {
        return this.courtService.getStatusSummary(tenant.tenantId);
    }
    /**
     * GET /courts/by-branch/:branchId
     * Returns all courts in a branch. Optional ?status= filter.
     */
    findByBranch(branchId, tenant, status) {
        return this.courtService.findByBranch(branchId, tenant.tenantId, status);
    }
    /**
     * GET /courts/by-sport/:sportId
     * Returns all courts linked to a sport. Optional ?branchId= filter.
     */
    findBySport(sportId, tenant, branchId) {
        return this.courtService.findBySport(sportId, tenant.tenantId, branchId);
    }
    findOne(id, tenant) {
        return this.courtService.findOne(id, tenant.tenantId);
    }
};
exports.CourtController = CourtController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_court_dto_1.CreateCourtDto, Object, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_court_dto_1.GenerateCourtsDto, Object, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "generateCourts", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_court_dto_1.UpdateCourtDto, Object, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "update", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_court_dto_1.CourtStatusDto, Object, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Patch)(':id/maintenance'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_court_dto_1.MaintenanceDto, Object, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "setMaintenance", null);
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
], CourtController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('branchId')),
    __param(2, (0, common_1.Query)('sportId')),
    __param(3, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('status-summary'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "getStatusSummary", null);
__decorate([
    (0, common_1.Get)('by-branch/:branchId'),
    __param(0, (0, common_1.Param)('branchId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "findByBranch", null);
__decorate([
    (0, common_1.Get)('by-sport/:sportId'),
    __param(0, (0, common_1.Param)('sportId', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, common_1.Query)('branchId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "findBySport", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CourtController.prototype, "findOne", null);
exports.CourtController = CourtController = __decorate([
    (0, common_1.Controller)('courts'),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [court_service_1.CourtService])
], CourtController);
//# sourceMappingURL=court.controller.js.map