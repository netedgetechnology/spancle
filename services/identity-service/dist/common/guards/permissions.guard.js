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
var PermissionsGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_sdk_1 = require("@spancle/auth-sdk");
const roles_decorator_1 = require("../decorators/roles.decorator");
/**
 * PermissionsGuard — enforces @RequirePermissions() metadata.
 *
 * Execution position: after RolesGuard.
 *
 * Behaviour:
 *   - @Public()                               → always passes
 *   - No @RequirePermissions()                → passes
 *   - @RequirePermissions({resource, action}) → ALL listed permissions must be satisfied
 *   - SUPER_ADMIN                             → always passes (RbacEngine wildcard)
 *
 * Differs from RolesGuard:
 *   - RolesGuard checks WHAT role a user has
 *   - PermissionsGuard checks WHAT they can do with it
 *   Both can coexist on the same endpoint.
 */
let PermissionsGuard = PermissionsGuard_1 = class PermissionsGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(PermissionsGuard_1.name);
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const requiredPermissions = this.reflector.getAllAndOverride(roles_decorator_1.PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredPermissions || requiredPermissions.length === 0)
            return true;
        const request = context
            .switchToHttp()
            .getRequest();
        const { user } = request;
        if (!user) {
            this.logger.error('PermissionsGuard reached without an authenticated user');
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        const rbacContext = {
            userId: user.userId,
            tenantId: user.tenantId,
            role: user.role,
        };
        // ALL required permissions must pass — AND semantics
        for (const permission of requiredPermissions) {
            const result = auth_sdk_1.RbacEngine.evaluate(rbacContext, permission);
            if (result.decision === 'deny') {
                this.logger.warn(`Permission denial — userId: ${user.userId} tenantId: ${user.tenantId} ` +
                    `role: "${user.role}" required: ${permission.resource}.${permission.action} ` +
                    `reason: "${result.reason}" path: ${request.path}`);
                throw new common_1.ForbiddenException(`Missing permission: ${permission.resource}:${permission.action}`);
            }
        }
        return true;
    }
};
exports.PermissionsGuard = PermissionsGuard;
exports.PermissionsGuard = PermissionsGuard = PermissionsGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PermissionsGuard);
//# sourceMappingURL=permissions.guard.js.map