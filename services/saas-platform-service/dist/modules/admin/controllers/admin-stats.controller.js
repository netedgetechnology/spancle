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
exports.AdminStatsController = void 0;
const common_1 = require("@nestjs/common");
const audit_interceptor_1 = require("../../../common/interceptors/audit.interceptor");
const super_admin_guard_1 = require("../guards/super-admin.guard");
const admin_stats_service_1 = require("../services/admin-stats.service");
/**
 * AdminStatsController — platform-wide metrics for the superadmin dashboard.
 *
 * All routes require:
 *   - JwtAuthGuard (global — via AppModule)
 *   - SuperAdminGuard (class-level — role === 'SUPER_ADMIN')
 *
 * Routes:
 *   GET /api/v1/admin/stats?period=30
 *     Returns aggregated platform statistics for the given period window.
 *     period: number of days for "this period" comparisons (default: 30)
 */
let AdminStatsController = class AdminStatsController {
    constructor(statsService) {
        this.statsService = statsService;
    }
    getStats(period) {
        return this.statsService.getStats(period ?? 30);
    }
};
exports.AdminStatsController = AdminStatsController;
__decorate([
    (0, common_1.Get)('stats'),
    __param(0, (0, common_1.Query)('period', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AdminStatsController.prototype, "getStats", null);
exports.AdminStatsController = AdminStatsController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(super_admin_guard_1.SuperAdminGuard),
    (0, common_1.UseInterceptors)(audit_interceptor_1.AuditInterceptor),
    __metadata("design:paramtypes", [admin_stats_service_1.AdminStatsService])
], AdminStatsController);
//# sourceMappingURL=admin-stats.controller.js.map