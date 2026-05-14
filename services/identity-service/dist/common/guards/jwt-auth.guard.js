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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const passport_1 = require("@nestjs/passport");
const roles_decorator_1 = require("../decorators/roles.decorator");
/**
 * JwtAuthGuard — validates the Bearer access token on every protected route.
 *
 * Extends Passport's AuthGuard('jwt') to add:
 *   1. @Public() short-circuit — skips validation for public routes
 *   2. Structured error logging with request context
 *   3. Consistent 401 error shape for all auth failures
 *
 * Execution order guarantee:
 *   TenantGuard → JwtAuthGuard → RolesGuard → PermissionsGuard → Handler
 *
 * On success: sets request.user = JwtPayload (via JwtStrategy.validate())
 */
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard extends (0, passport_1.AuthGuard)('jwt') {
    constructor(reflector) {
        super();
        this.reflector = reflector;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        return super.canActivate(context);
    }
    /**
     * Called by Passport after strategy validation.
     * Overridden to provide structured error responses.
     */
    handleRequest(err, user, info, context) {
        if (err ?? !user) {
            const request = context.switchToHttp().getRequest();
            const reason = info?.name === 'TokenExpiredError'
                ? 'Access token expired'
                : info?.name === 'JsonWebTokenError'
                    ? 'Invalid access token'
                    : info?.message ?? 'Authentication required';
            this.logger.warn(`Auth failed — reason: "${reason}" path: ${request.path} ip: ${request.ip ?? 'unknown'}`);
            throw new common_1.UnauthorizedException(reason);
        }
        return user;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map