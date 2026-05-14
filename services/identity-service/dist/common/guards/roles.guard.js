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
var RolesGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_sdk_1 = require("@spancle/auth-sdk");
const roles_decorator_1 = require("../decorators/roles.decorator");
/**
 * RolesGuard — enforces @Roles() metadata using the stateless RbacEngine.
 *
 * Execution position: after JwtAuthGuard (requires request.user to be populated).
 *
 * Behaviour:
 *   - @Public()          → always passes
 *   - No @Roles()        → passes (any authenticated user)
 *   - @Roles('X', 'Y')  → passes if user.role is X or Y
 *   - SUPER_ADMIN        → always passes (wildcard — handled by RbacEngine)
 *
 * Emits a structured log on denial — feeds into the audit pipeline.
 */
let RolesGuard = RolesGuard_1 = class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(RolesGuard_1.name);
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        // No @Roles() decorator — any authenticated user is permitted
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        const request = context
            .switchToHttp()
            .getRequest();
        const { user } = request;
        // Treat absence of user as a guard ordering bug — should not reach here
        if (!user) {
            this.logger.error('RolesGuard reached without an authenticated user — check guard ordering');
            throw new common_1.ForbiddenException('Insufficient permissions');
        }
        const rbacContext = {
            userId: user.userId,
            tenantId: user.tenantId,
            role: user.role,
        };
        const hasRole = auth_sdk_1.RbacEngine.hasRole(rbacContext, requiredRoles);
        if (!hasRole) {
            this.logger.warn(`RBAC denial — userId: ${user.userId} tenantId: ${user.tenantId} ` +
                `role: "${user.role}" required: [${requiredRoles.join(', ')}] ` +
                `path: ${request.path}`);
            throw new common_1.ForbiddenException('Insufficient role permissions');
        }
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = RolesGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map