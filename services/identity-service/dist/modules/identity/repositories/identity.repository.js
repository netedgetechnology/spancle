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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var IdentityRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdentityRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const identity_entity_1 = require("../entities/identity.entity");
let IdentityRepository = IdentityRepository_1 = class IdentityRepository {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(IdentityRepository_1.name);
    }
    /**
     * All queries MUST filter by tenantId — no cross-tenant reads permitted.
     */
    async findByEmailAndTenant(email, tenantId) {
        // passwordHash selected explicitly — normally excluded via select: false
        return this.repo
            .createQueryBuilder('identity')
            .addSelect('identity.passwordHash')
            .where('identity.email = :email', { email })
            .andWhere('identity.tenantId = :tenantId', { tenantId })
            .getOne();
    }
    async findByIdAndTenant(id, tenantId) {
        return this.repo
            .createQueryBuilder('identity')
            .addSelect('identity.passwordHash')
            .where('identity.id = :id', { id })
            .andWhere('identity.tenantId = :tenantId', { tenantId })
            .getOne();
    }
    async create(entity) {
        const record = this.repo.create(entity);
        return this.repo.save(record);
    }
    /**
     * Records a successful login — resets failure counters, updates lastLoginAt.
     */
    async updateLoginSuccess(id, tenantId) {
        await this.repo.update({ id, tenantId }, {
            lastLoginAt: new Date(),
            failedLoginAttempts: 0,
            lockedUntil: null,
        });
    }
    /**
     * Records a failed login attempt — increments counter, optionally sets lock.
     */
    async updateLoginFailure(id, tenantId, attemptCount, lockedUntil) {
        await this.repo.update({ id, tenantId }, { failedLoginAttempts: attemptCount, lockedUntil });
    }
    /**
     * Updates the password hash and sets passwordChangedAt timestamp.
     */
    async updatePassword(id, tenantId, newHash) {
        await this.repo.update({ id, tenantId }, {
            passwordHash: newHash,
            passwordChangedAt: new Date(),
        });
    }
    /**
     * Resolves the system role for an identity by joining to the user and role tables.
     * Returns null if no role is assigned — caller defaults to 'VIEWER'.
     *
     * TODO: Join to user → role in Sprint 2 when UserModule is wired.
     */
    async getRoleForIdentity(identityId, _tenantId) {
        // Placeholder — returns null until UserModule role join is implemented
        this.logger.debug(`getRoleForIdentity called for ${identityId} — returning null (Sprint 2)`);
        return null;
    }
    async updateLastLogin(id, tenantId) {
        await this.repo.update({ id, tenantId }, { lastLoginAt: new Date() });
    }
    async deactivate(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isActive: false });
    }
};
exports.IdentityRepository = IdentityRepository;
exports.IdentityRepository = IdentityRepository = IdentityRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(identity_entity_1.IdentityEntity)),
    __metadata("design:paramtypes", [Function])
], IdentityRepository);
//# sourceMappingURL=identity.repository.js.map