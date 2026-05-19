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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const tenant_entity_1 = require("../entities/tenant.entity");
let TenantRepository = class TenantRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(tenant_entity_1.TenantEntity, dataSource.manager);
    }
    async findBySlug(slug) {
        return this.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .findOne({ where: { slug, isDeleted: false } });
    }
    async findRawById(id) {
        return this.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .findOne({ where: { id, isDeleted: false } });
    }
    async findByEmail(email) {
        return this.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .createQueryBuilder('t')
            .where('t.email = :email', { email })
            .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('t.status != :terminated', { terminated: 'terminated' })
            .getOne();
    }
    async findAllTenants(page = 1, limit = 20, status, tier) {
        const qb = this.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .createQueryBuilder('t')
            .where('t.isDeleted = :isDeleted', { isDeleted: false });
        if (status)
            qb.andWhere('t.status = :status', { status });
        if (tier)
            qb.andWhere('t.tier = :tier', { tier });
        const [data, total] = await qb
            .orderBy('t.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async updateStatus(tenantId, status) {
        await this.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .update({ id: tenantId }, { status, updatedAt: new Date() });
    }
    async updateTier(tenantId, tier) {
        await this.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .update({ id: tenantId }, { tier, updatedAt: new Date() });
    }
    async findOwnSettings(tenantId) {
        return this.findRawById(tenantId);
    }
    async findActiveBySlugOrEmail(q) {
        const repo = this.entityManager.getRepository(tenant_entity_1.TenantEntity);
        const bySlug = await repo
            .createQueryBuilder('t')
            .where('LOWER(t.slug) = LOWER(:q)', { q })
            .andWhere('t.status = :status', { status: 'active' })
            .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
            .getOne();
        if (bySlug)
            return bySlug;
        return repo
            .createQueryBuilder('t')
            .where('LOWER(t.email) = LOWER(:q)', { q })
            .andWhere('t.status = :status', { status: 'active' })
            .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
            .getOne();
    }
    async isSlugTaken(slug, excludeId) {
        const qb = this.entityManager
            .getRepository(tenant_entity_1.TenantEntity)
            .createQueryBuilder('t')
            .where('LOWER(t.slug) = LOWER(:slug)', { slug })
            .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('t.status != :terminated', { terminated: 'terminated' });
        if (excludeId) {
            qb.andWhere('t.id != :excludeId', { excludeId });
        }
        const count = await qb.getCount();
        return count > 0;
    }
};
exports.TenantRepository = TenantRepository;
exports.TenantRepository = TenantRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], TenantRepository);
//# sourceMappingURL=tenant.repository.js.map