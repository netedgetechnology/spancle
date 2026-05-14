"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const auth_controller_1 = require("./controllers/auth.controller");
const auth_service_1 = require("./services/auth.service");
const token_service_1 = require("./services/token.service");
const password_service_1 = require("./services/password.service");
const auth_repository_1 = require("./repositories/auth.repository");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const identity_entity_1 = require("../identity/entities/identity.entity");
const identity_repository_1 = require("../identity/repositories/identity.repository");
/**
 * AuthModule — the authentication and authorisation foundation.
 *
 * Exports:
 *   - JwtModule       → for signing tokens in other modules
 *   - TokenService    → for programmatic token management
 *   - PasswordService → for identity creation in UserModule
 *   - AuthRepository  → for JwtStrategy access to blacklist
 *
 * Guards (JwtAuthGuard, TenantGuard, RolesGuard, PermissionsGuard) are
 * registered as global guards in AppModule — not here.
 * This keeps AuthModule focused on auth logic, not cross-cutting guards.
 */
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.getOrThrow('JWT_SECRET'),
                    signOptions: {
                        issuer: config.get('JWT_ISSUER', 'spancle-sports-os'),
                        algorithm: 'HS256',
                    },
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([identity_entity_1.IdentityEntity]),
        ],
        controllers: [auth_controller_1.AuthController],
        providers: [
            auth_service_1.AuthService,
            token_service_1.TokenService,
            password_service_1.PasswordService,
            auth_repository_1.AuthRepository,
            jwt_strategy_1.JwtStrategy,
            identity_repository_1.IdentityRepository,
        ],
        exports: [
            auth_service_1.AuthService,
            token_service_1.TokenService,
            password_service_1.PasswordService,
            auth_repository_1.AuthRepository,
            jwt_1.JwtModule,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map