"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantAwareRepository = exports.TenantIsolationViolationError = void 0;
const common_1 = require("@nestjs/common");
const tenant_cls_context_1 = require("../context/tenant-cls.context");
class TenantIsolationViolationError extends Error {
    constructor(operation, entity) {
        super(`Tenant isolation violation: attempted "${operation}" on "${entity}" ` +
            'without a tenantId. This is a programming error — all queries must ' +
            'be scoped to a tenant.');
        this.name = 'TenantIsolationViolationError';
    }
}
exports.TenantIsolationViolationError = TenantIsolationViolationError;
class TenantAwareRepository {
    constructor(entity, manager) {
        this.entity = entity;
        this.manager = manager;
        this.repo = manager.getRepository(entity);
        this.entityName = typeof entity === 'function' ? entity.name : String(entity);
        this.logger = new common_1.Logger(`TenantRepo:${this.entityName}`);
    }
    resolveTenantId(explicitTenantId) {
        if (explicitTenantId && explicitTenantId.trim() !== '') {
            return explicitTenantId;
        }
        const clsCtx = tenant_cls_context_1.TenantClsContext.get();
        if (clsCtx?.tenantId) {
            return clsCtx.tenantId;
        }
        throw new TenantIsolationViolationError('resolveTenantId', this.entityName);
    }
    scopedQb(alias, tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId: resolvedTenantId })
            .andWhere(`${alias}.isDeleted = :isDeleted`, { isDeleted: false });
    }
    scopedQbWithDeleted(alias, tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId: resolvedTenantId });
    }
    async findById(id, tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        return this.repo.findOne({
            where: {
                id,
                tenantId: resolvedTenantId,
                isDeleted: false,
            },
        });
    }
    async findByIdOrFail(id, tenantId) {
        const entity = await this.findById(id, tenantId);
        if (!entity) {
            throw new common_1.NotFoundException(`${this.entityName} with id "${id}" not found`);
        }
        return entity;
    }
    async findAll(tenantId, options) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        return this.repo.find({
            ...options,
            where: {
                tenantId: resolvedTenantId,
                isDeleted: false,
            },
        });
    }
    async count(tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        return this.repo.count({
            where: {
                tenantId: resolvedTenantId,
                isDeleted: false,
            },
        });
    }
    async existsById(id, tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        const count = await this.repo.count({
            where: {
                id,
                tenantId: resolvedTenantId,
                isDeleted: false,
            },
        });
        return count > 0;
    }
    async insert(data, tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        if (data.tenantId && data.tenantId !== resolvedTenantId) {
            throw new TenantIsolationViolationError('insert:tenantId_mismatch', this.entityName);
        }
        const entity = this.repo.create({
            ...data,
            tenantId: resolvedTenantId,
            isDeleted: false,
        });
        return this.repo.save(entity);
    }
    async updateById(id, data, tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        if ('tenantId' in data) {
            throw new TenantIsolationViolationError('update:tenantId_mutation', this.entityName);
        }
        const result = await this.repo
            .createQueryBuilder()
            .update()
            .set({ ...data, updatedAt: new Date() })
            .where('id = :id AND tenantId = :tenantId AND isDeleted = :isDeleted', {
            id,
            tenantId: resolvedTenantId,
            isDeleted: false,
        })
            .execute();
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`${this.entityName} with id "${id}" not found or does not belong to tenant`);
        }
        return this.findByIdOrFail(id, resolvedTenantId);
    }
    async softDelete(id, tenantId) {
        const resolvedTenantId = this.resolveTenantId(tenantId);
        const result = await this.repo
            .createQueryBuilder()
            .update()
            .set({
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
            .where('id = :id AND tenantId = :tenantId AND isDeleted = :isDeleted', {
            id,
            tenantId: resolvedTenantId,
            isDeleted: false,
        })
            .execute();
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`${this.entityName} with id "${id}" not found`);
        }
        this.logger.debug(`Soft deleted ${this.entityName} id=${id} tenantId=${resolvedTenantId}`);
    }
    async softDeleteMany(ids, tenantId) {
        if (ids.length === 0)
            return 0;
        const resolvedTenantId = this.resolveTenantId(tenantId);
        const result = await this.repo
            .createQueryBuilder()
            .update()
            .set({
            isDeleted: true,
            deletedAt: new Date(),
            updatedAt: new Date(),
        })
            .where('id IN (:...ids) AND tenantId = :tenantId AND isDeleted = :isDeleted', {
            ids,
            tenantId: resolvedTenantId,
            isDeleted: false,
        })
            .execute();
        this.logger.debug(`Bulk soft deleted ${result.affected ?? 0} ${this.entityName} records — tenantId=${resolvedTenantId}`);
        return result.affected ?? 0;
    }
    async findPaginated(tenantId, page = 1, limit = 20, alias = 'entity') {
        const qb = this.scopedQb(alias, tenantId);
        const [data, total] = await qb
            .orderBy(`${alias}.createdAt`, 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    get entityManager() {
        return this.manager;
    }
}
exports.TenantAwareRepository = TenantAwareRepository;
//# sourceMappingURL=tenant-aware.repository.js.map