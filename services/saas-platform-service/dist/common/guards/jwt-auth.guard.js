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
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const types_1 = require("@spancle/types");
const roles_decorator_1 = require("../decorators/roles.decorator");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard {
    constructor(reflector, jwtService, configService) {
        this.reflector = reflector;
        this.jwtService = jwtService;
        this.configService = configService;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
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
            this.logger.warn(`Unauthenticated request to ${req.path} — missing Authorization header`);
            throw new common_1.UnauthorizedException('Authentication required');
        }
        const token = authHeader.slice('Bearer '.length).trim();
        try {
            const rawPayload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.getOrThrow('JWT_SECRET'),
                issuer: this.configService.get('JWT_ISSUER', 'spancle-sports-os'),
            });
            const result = types_1.JwtPayloadSchema.safeParse(rawPayload);
            if (!result.success) {
                this.logger.warn(`JWT payload failed schema validation: ${result.error.message}`);
                throw new common_1.UnauthorizedException('Malformed token payload');
            }
            const payload = result.data;
            req.user = {
                userId: payload.sub,
                role: payload.role,
                tenantId: payload.tenantId,
            };
            return true;
        }
        catch (err) {
            const reason = err instanceof Error && err.name === 'TokenExpiredError'
                ? 'Access token expired'
                : err instanceof Error && err.name === 'JsonWebTokenError'
                    ? 'Invalid access token'
                    : 'Authentication required';
            this.logger.warn(`Auth failed — reason: "${reason}" path: ${req.path}`);
            throw new common_1.UnauthorizedException(reason);
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        jwt_1.JwtService,
        config_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map