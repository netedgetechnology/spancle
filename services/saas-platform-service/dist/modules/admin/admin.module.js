"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_stats_controller_1 = require("./controllers/admin-stats.controller");
const admin_stats_service_1 = require("./services/admin-stats.service");
const super_admin_guard_1 = require("./guards/super-admin.guard");
/**
 * AdminModule — platform administration endpoints.
 *
 * All routes require SUPER_ADMIN role (enforced by SuperAdminGuard
 * at controller class level, plus the global RolesGuard chain).
 *
 * Registered in AppModule.imports alongside CmsModule.
 */
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        controllers: [admin_stats_controller_1.AdminStatsController],
        providers: [admin_stats_service_1.AdminStatsService, super_admin_guard_1.SuperAdminGuard],
        exports: [admin_stats_service_1.AdminStatsService],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map