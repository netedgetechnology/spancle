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
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const types_1 = require("@spancle/types");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TENANT_HEADER = 'x-tenant-id';
let TenantGuard = TenantGuard_1 = class TenantGuard {
    constructor() {
        this.logger = new common_1.Logger(TenantGuard_1.name);
    }
    canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        const tenantId = req.headers[TENANT_HEADER];
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
    constructor(reflector, jwtService, configService) {
        this.reflector = reflector;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(RbacGuard_1.name);
    }
    async canActivate(ctx) {
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (isPublic)
            return true;
        const req = ctx.switchToHttp().getRequest();
        const authHeader = req.headers['authorization'];
        if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
            this.logger.warn(`Missing Authorization header — path=${req.path}`);
            throw new common_1.UnauthorizedException('Authentication required');
        }
        const token = authHeader.slice('Bearer '.length).trim();
        let payload;
        try {
            const raw = await this.jwtService.verifyAsync(token, {
                secret: this.configService.getOrThrow('JWT_SECRET'),
                issuer: this.configService.get('JWT_ISSUER', 'spancle-sports-os'),
            });
            const result = types_1.JwtPayloadSchema.safeParse(raw);
            if (!result.success) {
                throw new common_1.UnauthorizedException('Malformed token payload');
            }
            payload = result.data;
        }
        catch (err) {
            const reason = err instanceof Error && err.name === 'TokenExpiredError' ? 'Access token expired' :
                err instanceof Error && err.name === 'JsonWebTokenError' ? 'Invalid access token' :
                    err instanceof common_1.UnauthorizedException ? err.message :
                        'Authentication required';
            this.logger.warn(`Auth failed — reason="${reason}" path=${req.path}`);
            throw new common_1.UnauthorizedException(reason);
        }
        req.actor = {
            actorId: payload.sub,
            tenantId: req.tenant?.tenantId ?? payload.tenantId,
            role: payload.role,
            userId: payload['userId'] ?? null,
        };
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            ctx.getHandler(),
            ctx.getClass(),
        ]);
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        if (payload.role === 'SUPER_ADMIN')
            return true;
        if (!requiredRoles.includes(payload.role)) {
            this.logger.warn(`Access denied — actor=${payload.sub} role=${payload.role} required=[${requiredRoles.join(',')}]`);
            throw new common_1.ForbiddenException(`Required role: ${requiredRoles.join(' or ')}. Your role: ${payload.role}`);
        }
        return true;
    }
};
exports.RbacGuard = RbacGuard;
exports.RbacGuard = RbacGuard = RbacGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        jwt_1.JwtService,
        config_1.ConfigService])
], RbacGuard);
//# sourceMappingURL=booking.guard.js.map