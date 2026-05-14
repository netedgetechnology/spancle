"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const identity_controller_1 = require("./controllers/identity.controller");
const identity_service_1 = require("./services/identity.service");
const identity_repository_1 = require("./repositories/identity.repository");
const identity_entity_1 = require("./entities/identity.entity");
let IdentityModule = class IdentityModule {
};
exports.IdentityModule = IdentityModule;
exports.IdentityModule = IdentityModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'jwt' }),
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.getOrThrow('JWT_SECRET'),
                    signOptions: {
                        expiresIn: config.get('JWT_ACCESS_TOKEN_EXPIRY', '15m'),
                        issuer: config.get('JWT_ISSUER', 'spancle-sports-os'),
                    },
                }),
            }),
            typeorm_1.TypeOrmModule.forFeature([identity_entity_1.IdentityEntity]),
        ],
        controllers: [identity_controller_1.IdentityController],
        providers: [identity_service_1.IdentityService, identity_repository_1.IdentityRepository],
        exports: [identity_service_1.IdentityService, identity_repository_1.IdentityRepository, jwt_1.JwtModule],
    })
], IdentityModule);
//# sourceMappingURL=identity.module.js.map