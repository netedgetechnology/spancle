"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ConsumerRegistrationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsumerRegistrationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const user_repository_1 = require("../../user/repositories/user.repository");
const identity_repository_1 = require("../../identity/repositories/identity.repository");
const token_service_1 = require("../../auth/services/token.service");
const password_service_1 = require("../../auth/services/password.service");
let ConsumerRegistrationService = ConsumerRegistrationService_1 = class ConsumerRegistrationService {
    constructor(dataSource, userRepository, identityRepository, passwordService, tokenService, eventEmitter) {
        this.dataSource = dataSource;
        this.userRepository = userRepository;
        this.identityRepository = identityRepository;
        this.passwordService = passwordService;
        this.tokenService = tokenService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(ConsumerRegistrationService_1.name);
    }
    async register(dto, tenantId) {
        const existing = await this.identityRepository.findByEmailAndTenant(dto.email.toLowerCase().trim(), tenantId);
        if (existing) {
            throw new common_1.ConflictException('An account with this email already exists');
        }
        if (dto.password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters');
        }
        const passwordHash = await this.passwordService.hash(dto.password);
        const { user, identity } = await this.dataSource.transaction(async (manager) => {
            const userRepo = manager.getRepository((await Promise.resolve().then(() => __importStar(require('../../user/entities/user.entity')))).UserEntity);
            const identityRepo = manager.getRepository((await Promise.resolve().then(() => __importStar(require('../../identity/entities/identity.entity')))).IdentityEntity);
            const userEntity = await userRepo.save(userRepo.create({
                tenantId,
                name: dto.name.trim(),
                email: dto.email.toLowerCase().trim(),
                role: 'PLAYER',
            }));
            const identityEntity = await identityRepo.save(identityRepo.create({
                tenantId,
                userId: userEntity.id,
                email: dto.email.toLowerCase().trim(),
                passwordHash,
                isActive: true,
                isEmailVerified: false,
            }));
            return { user: userEntity, identity: identityEntity };
        });
        const tokenPair = await this.tokenService.issueTokenPair({
            identityId: identity.id,
            userId: user.id,
            tenantId,
            role: 'PLAYER',
        });
        await this.eventEmitter.emitAsync('consumer.registered', {
            tenantId,
            userId: user.id,
            customerEmail: dto.email.toLowerCase().trim(),
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Consumer registered — tenant=${tenantId} userId=${user.id}`);
        return {
            userId: user.id,
            accessToken: tokenPair.tokens.accessToken,
            refreshToken: tokenPair.tokens.refreshToken,
        };
    }
};
exports.ConsumerRegistrationService = ConsumerRegistrationService;
exports.ConsumerRegistrationService = ConsumerRegistrationService = ConsumerRegistrationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        user_repository_1.UserRepository,
        identity_repository_1.IdentityRepository,
        password_service_1.PasswordService,
        token_service_1.TokenService,
        event_emitter_1.EventEmitter2])
], ConsumerRegistrationService);
//# sourceMappingURL=consumer-registration.service.js.map