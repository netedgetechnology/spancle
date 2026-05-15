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
var JwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const types_1 = require("@spancle/types");
const auth_sdk_1 = require("@spancle/auth-sdk");
const auth_repository_1 = require("../repositories/auth.repository");
let JwtStrategy = JwtStrategy_1 = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy, 'jwt') {
    constructor(config, authRepository) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: config.getOrThrow('JWT_SECRET'),
            issuer: config.get('JWT_ISSUER', 'spancle-sports-os'),
        });
        this.authRepository = authRepository;
        this.logger = new common_1.Logger(JwtStrategy_1.name);
    }
    async validate(rawPayload) {
        const result = types_1.JwtPayloadSchema.safeParse(rawPayload);
        if (!result.success) {
            this.logger.warn(`JWT payload failed schema validation: ${result.error.message}`);
            throw new common_1.UnauthorizedException('Malformed token payload');
        }
        const payload = result.data;
        const isBlacklisted = await this.authRepository.isTokenBlacklisted(payload.tenantId, payload.jti ?? payload.sub);
        if (isBlacklisted) {
            this.logger.warn(`Blacklisted token used — sub: ${payload.sub} tenantId: ${payload.tenantId}`);
            throw new common_1.UnauthorizedException('Token has been revoked');
        }
        if (auth_sdk_1.TokenUtils.isExpiringSoon(payload.exp, 60)) {
            this.logger.debug(`Token expiring soon — sub: ${payload.sub} seconds: ${auth_sdk_1.TokenUtils.secondsUntilExpiry(payload.exp)}`);
        }
        return payload;
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = JwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        auth_repository_1.AuthRepository])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map