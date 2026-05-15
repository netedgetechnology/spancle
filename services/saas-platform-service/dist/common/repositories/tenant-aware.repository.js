"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantAwareRepository = void 0;
const common_1 = require("@nestjs/common");
class TenantAwareRepository {
    constructor(entity, entityManager) {
        this.entity = entity;
        this.entityManager = entityManager;
        this.entityName = typeof entity === 'function' ? entity.name : String(entity);
        this.logger = new common_1.Logger(this.entityName + 'Repository');
    }
    scopedQb(alias, tenantId) {
        return this.entityManager
            .createQueryBuilder(this.entity, alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId })
            .andWhere(`${alias}.isDeleted = false`);
    }
    async findAll(tenantId) {
        return this.scopedQb('e', tenantId).getMany();
    }
    async findById(id, tenantId) {
        return this.scopedQb('e', tenantId)
            .andWhere('e.id = :id', { id })
            .getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const entity = await this.findById(id, tenantId);
        if (!entity) {
            throw new common_1.NotFoundException(`${this.entityName} ${id} not found`);
        }
        return entity;
    }
    async count(tenantId) {
        return this.scopedQb('e', tenantId).getCount();
    }
    async insert(data, tenantId) {
        const row = this.entityManager.create(this.entity, {
            ...data,
            tenantId,
        });
        return this.entityManager.save(this.entity, row);
    }
    async updateById(id, data, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(this.entity)
            .set({ ...data, updatedAt: new Date() })
            .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
            .execute();
        return this.findByIdOrFail(id, tenantId);
    }
    async softDelete(id, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(this.entity)
            .set({ isDeleted: true, deletedAt: new Date() })
            .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
            .execute();
    }
}
exports.TenantAwareRepository = TenantAwareRepository;
//# sourceMappingURL=tenant-aware.repository.js.map