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
var IdentityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const event_emitter_1 = require("@nestjs/event-emitter");
const identity_repository_1 = require("../repositories/identity.repository");
const identity_events_1 = require("../events/identity.events");
let IdentityService = IdentityService_1 = class IdentityService {
    constructor(identityRepository, jwtService, eventEmitter) {
        this.identityRepository = identityRepository;
        this.jwtService = jwtService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(IdentityService_1.name);
    }
    async login(dto, tenantId) {
        this.logger.log(`Login attempt — tenant: ${tenantId}, email: ${dto.email}`);
        const identity = await this.identityRepository.findByEmailAndTenant(dto.email, tenantId);
        if (!identity) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        // TODO: bcrypt.compare(dto.password, identity.passwordHash)
        const tokens = this.generateTokenPair(identity.id, tenantId, identity.userId);
        await this.eventEmitter.emitAsync(identity_events_1.IdentityEvents.LOGIN_SUCCESS, { tenantId, identityId: identity.id, userId: identity.userId });
        return tokens;
    }
    async refreshToken(dto, tenantId) {
        // TODO: Validate refresh token against Redis store, rotate token
        this.logger.log(`Token refresh — tenant: ${tenantId}`);
        throw new common_1.UnauthorizedException('Not implemented');
    }
    async logout(refreshToken, tenantId) {
        this.logger.log(`Logout — tenant: ${tenantId}`);
        // TODO: Revoke refresh token in Redis
        await this.eventEmitter.emitAsync(identity_events_1.IdentityEvents.LOGOUT, { tenantId, refreshToken });
    }
    generateTokenPair(identityId, tenantId, userId) {
        const payload = { sub: identityId, tenantId, userId };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
        return { accessToken, refreshToken, expiresIn: 900 };
    }
};
exports.IdentityService = IdentityService;
exports.IdentityService = IdentityService = IdentityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [identity_repository_1.IdentityRepository,
        jwt_1.JwtService,
        event_emitter_1.EventEmitter2])
], IdentityService);
//# sourceMappingURL=identity.service.js.map