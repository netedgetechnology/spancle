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
var OnboardingTokenService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnboardingTokenService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const node_crypto_1 = require("node:crypto");
const redis_config_1 = require("../../../infrastructure/config/redis.config");
let OnboardingTokenService = OnboardingTokenService_1 = class OnboardingTokenService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(OnboardingTokenService_1.name);
        this.REG_TTL_S = 48 * 60 * 60;
        this.TOKEN_TTL_S = 24 * 60 * 60;
        this.IDEM_TTL_S = 60;
    }
    onModuleInit() {
        this.redis = (0, redis_config_1.createRedisClient)(this.config, 'cache');
        this.logger.log('OnboardingTokenService Redis client initialised');
    }
    async createRegistration(data) {
        const registrationId = (0, node_crypto_1.randomBytes)(16).toString('hex');
        const now = new Date().toISOString();
        const record = {
            registrationId,
            step: 1,
            emailVerified: false,
            packageId: null,
            billingCycle: 'monthly',
            tenantId: null,
            subscriptionId: null,
            createdAt: now,
            lastUpdatedAt: now,
            ...data,
        };
        await Promise.all([
            this.redis.setex(this.regKey(registrationId), this.REG_TTL_S, JSON.stringify(record)),
            this.redis.setex(this.slugKey(data.slug), this.REG_TTL_S, registrationId),
            this.redis.setex(this.emailKey(data.email), this.REG_TTL_S, registrationId),
        ]);
        return record;
    }
    async getRegistration(registrationId) {
        const raw = await this.redis.get(this.regKey(registrationId));
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    async updateRegistration(registrationId, patch) {
        const existing = await this.getRegistration(registrationId);
        if (!existing)
            throw new Error(`Registration ${registrationId} not found or expired`);
        const updated = {
            ...existing,
            ...patch,
            registrationId,
            lastUpdatedAt: new Date().toISOString(),
        };
        await this.redis.setex(this.regKey(registrationId), this.REG_TTL_S, JSON.stringify(updated));
        return updated;
    }
    async deleteRegistration(registrationId) {
        const record = await this.getRegistration(registrationId);
        if (!record)
            return;
        await Promise.all([
            this.redis.del(this.regKey(registrationId)),
            this.redis.del(this.tokenKey(registrationId)),
            this.redis.del(this.slugKey(record.slug)),
            this.redis.del(this.emailKey(record.email)),
        ]);
    }
    async generateVerificationToken(registrationId) {
        const token = (0, node_crypto_1.randomBytes)(32).toString('hex');
        await this.redis.setex(this.tokenKey(registrationId), this.TOKEN_TTL_S, token);
        return token;
    }
    async validateAndConsumeToken(registrationId, token) {
        const stored = await this.redis.get(this.tokenKey(registrationId));
        if (!stored || stored !== token)
            return false;
        await this.redis.del(this.tokenKey(registrationId));
        return true;
    }
    async isSlugReserved(slug) {
        return (await this.redis.exists(this.slugKey(slug))) === 1;
    }
    async isEmailPendingRegistration(email) {
        return this.redis.get(this.emailKey(email));
    }
    async getIdempotentResponse(key) {
        return this.redis.get(`onboarding:idempotency:${key}`);
    }
    async setIdempotentResponse(key, response) {
        await this.redis.setex(`onboarding:idempotency:${key}`, this.IDEM_TTL_S, JSON.stringify(response));
    }
    regKey(id) { return `onboarding:reg:${id}`; }
    tokenKey(id) { return `onboarding:token:${id}`; }
    slugKey(slug) { return `onboarding:slug:${slug}`; }
    emailKey(email) { return `onboarding:email:${email}`; }
};
exports.OnboardingTokenService = OnboardingTokenService;
exports.OnboardingTokenService = OnboardingTokenService = OnboardingTokenService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OnboardingTokenService);
//# sourceMappingURL=onboarding-token.service.js.map