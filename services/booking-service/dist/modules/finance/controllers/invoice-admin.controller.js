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
exports.InvoiceAdminController = void 0;
const common_1 = require("@nestjs/common");
const tenant_decorator_1 = require("../../../common/decorators/tenant.decorator");
const current_user_decorator_1 = require("../../../common/decorators/current-user.decorator");
const booking_guard_1 = require("../../booking/guards/booking.guard");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const invoice_service_1 = require("../services/invoice.service");
const invoice_dto_1 = require("../dto/invoice.dto");
let InvoiceAdminController = class InvoiceAdminController {
    constructor(invoiceService) {
        this.invoiceService = invoiceService;
    }
    draft(dto, tenant, actor) {
        return this.invoiceService.draft(dto, tenant.tenantId, actor.actorId);
    }
    findAll(tenant, status, customerId, limit = 50, offset = 0) {
        return this.invoiceService.findAll(tenant.tenantId, {
            status, customerId, limit, offset,
        });
    }
    findOne(id, tenant) {
        return this.invoiceService.findById(id, tenant.tenantId);
    }
    findByNumber(invoiceNumber, tenant) {
        return this.invoiceService.findByNumber(invoiceNumber, tenant.tenantId);
    }
    findByReference(sourceType, sourceId, tenant) {
        return this.invoiceService.findByReference(sourceType, sourceId, tenant.tenantId);
    }
    findLines(id, tenant) {
        return this.invoiceService.findLines(id, tenant.tenantId);
    }
    findTaxes(id, tenant) {
        return this.invoiceService.findTaxes(id, tenant.tenantId);
    }
    finalise(id, dto, tenant, actor) {
        return this.invoiceService.finalise(id, dto, tenant.tenantId, actor.actorId);
    }
    void(id, dto, tenant, actor) {
        return this.invoiceService.void(id, dto, tenant.tenantId, actor.actorId);
    }
};
exports.InvoiceAdminController = InvoiceAdminController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __param(2, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [invoice_dto_1.CreateInvoiceDto, Object, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "draft", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, tenant_decorator_1.TenantCtx)()),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('customerId')),
    __param(3, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(50), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('offset', new common_1.DefaultValuePipe(0), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('number/:invoiceNumber'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('invoiceNumber')),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "findByNumber", null);
__decorate([
    (0, common_1.Get)('source/:sourceType/:sourceId'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('sourceType')),
    __param(1, (0, common_1.Param)('sourceId', common_1.ParseUUIDPipe)),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "findByReference", null);
__decorate([
    (0, common_1.Get)(':id/lines'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "findLines", null);
__decorate([
    (0, common_1.Get)(':id/taxes'),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, tenant_decorator_1.TenantCtx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "findTaxes", null);
__decorate([
    (0, common_1.Patch)(':id/finalise'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN', 'TENANT_MANAGER'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invoice_dto_1.FinaliseInvoiceDto, Object, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "finalise", null);
__decorate([
    (0, common_1.Patch)(':id/void'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, roles_decorator_1.Roles)('TENANT_ADMIN'),
    __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, tenant_decorator_1.TenantCtx)()),
    __param(3, (0, current_user_decorator_1.BookingActor)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, invoice_dto_1.VoidInvoiceDto, Object, Object]),
    __metadata("design:returntype", Promise)
], InvoiceAdminController.prototype, "void", null);
exports.InvoiceAdminController = InvoiceAdminController = __decorate([
    (0, common_1.Controller)('finance/admin/invoices'),
    (0, common_1.UseGuards)(booking_guard_1.TenantGuard, booking_guard_1.RbacGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [invoice_service_1.InvoiceService])
], InvoiceAdminController);
//# sourceMappingURL=invoice-admin.controller.js.map