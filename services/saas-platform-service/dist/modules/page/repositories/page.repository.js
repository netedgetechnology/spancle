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
exports.PageRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const page_entity_1 = require("../entities/page.entity");
let PageRepository = class PageRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(page_entity_1.PageEntity, dataSource.manager);
    }
    async findBySlug(slug, tenantId) {
        return this.scopedQb('p', tenantId)
            .andWhere('p.slug = :slug', { slug })
            .getOne();
    }
    async findPublished(tenantId, page = 1, limit = 20) {
        const [data, total] = await this.scopedQb('p', tenantId)
            .andWhere('p.status = :status', { status: 'published' })
            .orderBy('p.sortOrder', 'ASC')
            .addOrderBy('p.createdAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async findByStatus(status, tenantId) {
        return this.scopedQb('p', tenantId)
            .andWhere('p.status = :status', { status })
            .orderBy('p.sortOrder', 'ASC')
            .getMany();
    }
    async findHomepage(tenantId) {
        return this.scopedQb('p', tenantId)
            .andWhere('p.isHomepage = :isHomepage', { isHomepage: true })
            .andWhere('p.status = :status', { status: 'published' })
            .getOne();
    }
    async isSlugTaken(slug, tenantId, excludeId) {
        const qb = this.scopedQb('p', tenantId)
            .andWhere('p.slug = :slug', { slug });
        if (excludeId) {
            qb.andWhere('p.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
    /** Clears isHomepage on all pages for the tenant before setting a new one */
    async clearHomepage(tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(page_entity_1.PageEntity)
            .set({ isHomepage: false })
            .where('tenantId = :tenantId AND isHomepage = true AND isDeleted = false', { tenantId })
            .execute();
    }
    async findPaginated(tenantId, page = 1, limit = 20, alias = 'p') {
        const [data, total] = await this.scopedQb(alias, tenantId)
            .orderBy(`${alias}.sortOrder`, 'ASC')
            .addOrderBy(`${alias}.createdAt`, 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
};
exports.PageRepository = PageRepository;
exports.PageRepository = PageRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], PageRepository);
//# sourceMappingURL=page.repository.js.map