"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SuperAdminGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SuperAdminGuard = void 0;
const common_1 = require("@nestjs/common");
/**
 * SuperAdminGuard — restricts access to SUPER_ADMIN role only.
 *
 * Applied at controller class level for all admin stats endpoints.
 * This is a defence-in-depth guard — the global RolesGuard also enforces
 * role checks, but this guard makes the SUPER_ADMIN requirement explicit
 * at the module level, independently of the global guard chain.
 *
 * Execution position: after JwtAuthGuard (requires request.user).
 *
 * Returns:
 *   - 401 if no authenticated user on the request
 *   - 403 if authenticated but not SUPER_ADMIN
 *   - passes if role === 'SUPER_ADMIN'
 */
let SuperAdminGuard = SuperAdminGuard_1 = class SuperAdminGuard {
    constructor() {
        this.logger = new common_1.Logger(SuperAdminGuard_1.name);
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        if (!request.user) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        if (request.user.role !== 'SUPER_ADMIN') {
            this.logger.warn(`SuperAdmin access denied — userId: ${request.user.userId} ` +
                `role: "${request.user.role}" path: ${request.path}`);
            throw new common_1.ForbiddenException('This endpoint requires SUPER_ADMIN role');
        }
        return true;
    }
};
exports.SuperAdminGuard = SuperAdminGuard;
exports.SuperAdminGuard = SuperAdminGuard = SuperAdminGuard_1 = __decorate([
    (0, common_1.Injectable)()
], SuperAdminGuard);
//# sourceMappingURL=super-admin.guard.js.map