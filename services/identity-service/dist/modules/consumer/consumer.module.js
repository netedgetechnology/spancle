"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumerModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const user_entity_1 = require("../user/entities/user.entity");
const identity_entity_1 = require("../identity/entities/identity.entity");
const user_repository_1 = require("../user/repositories/user.repository");
const identity_repository_1 = require("../identity/repositories/identity.repository");
const auth_module_1 = require("../auth/auth.module");
const consumer_controller_1 = require("./controllers/consumer.controller");
const consumer_registration_service_1 = require("./services/consumer-registration.service");
let ConsumerModule = class ConsumerModule {
};
exports.ConsumerModule = ConsumerModule;
exports.ConsumerModule = ConsumerModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([user_entity_1.UserEntity, identity_entity_1.IdentityEntity]),
            auth_module_1.AuthModule,
        ],
        controllers: [consumer_controller_1.ConsumerController],
        providers: [
            user_repository_1.UserRepository,
            identity_repository_1.IdentityRepository,
            consumer_registration_service_1.ConsumerRegistrationService,
        ],
        exports: [consumer_registration_service_1.ConsumerRegistrationService],
    })
], ConsumerModule);
//# sourceMappingURL=consumer.module.js.map