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
var TenantGuard_1, RbacGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacGuard = exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
let TenantGuard = TenantGuard_1 = class TenantGuard {
    constructor() {
        this.logger = new common_1.Logger(TenantGuard_1.name);
        this.tenantHeader = process.env['TENANT_HEADER'] ?? 'x-tenant-id';
    }
    canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const tenantId = req.headers[this.tenantHeader];
        if (!tenantId || typeof tenantId !== 'string' || !UUID_RE.test(tenantId)) {
            this.logger.warn(`Missing/invalid tenant header — ip=${req.ip ?? 'unknown'}`);
            throw new common_1.UnauthorizedException('Valid x-tenant-id header required');
        }
        req.tenant = { tenantId };
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = TenantGuard_1 = __decorate([
    (0, common_1.Injectable)()
], TenantGuard);
let RbacGuard = RbacGuard_1 = class RbacGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(RbacGuard_1.name);
    }
    canActivate(ctx) {
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (isPublic)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const actorId = req.headers['x-actor-id'];
        const actorRole = req.headers['x-actor-role'];
        const tenantId = req.tenant?.tenantId;
        if (!actorId || typeof actorId !== 'string' || !UUID_RE.test(actorId)) {
            throw new common_1.UnauthorizedException('Authenticated actor required');
        }
        req.actor = {
            actorId,
            tenantId: tenantId ?? '',
            role: typeof actorRole === 'string' ? actorRole : 'VIEWER',
        };
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        const role = req.actor.role;
        if (role === 'SUPER_ADMIN')
            return true;
        if (!requiredRoles.includes(role)) {
            this.logger.warn(`Access denied — actor=${actorId} role=${role} required=[${requiredRoles.join(',')}]`);
            throw new common_1.ForbiddenException(`Required role: ${requiredRoles.join(' or ')}. Your role: ${role}`);
        }
        return true;
    }
};
exports.RbacGuard = RbacGuard;
exports.RbacGuard = RbacGuard = RbacGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RbacGuard);
//# sourceMappingURL=booking.guard.js.map