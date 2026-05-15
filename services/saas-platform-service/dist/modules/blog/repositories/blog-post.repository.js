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
exports.BlogPostRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const blog_post_entity_1 = require("../entities/blog-post.entity");
let BlogPostRepository = class BlogPostRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(blog_post_entity_1.BlogPostEntity, dataSource.manager);
    }
    async findBySlug(slug, tenantId) {
        return this.scopedQb('b', tenantId)
            .andWhere('b.slug = :slug', { slug })
            .getOne();
    }
    async findByStatus(status, tenantId, page = 1, limit = 20) {
        const [data, total] = await this.scopedQb('b', tenantId)
            .andWhere('b.status = :status', { status })
            .orderBy('b.publishedAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async findByCategory(categoryId, tenantId, page = 1, limit = 20) {
        const [data, total] = await this.scopedQb('b', tenantId)
            .andWhere('b.categoryId = :categoryId', { categoryId })
            .andWhere('b.status = :status', { status: 'published' })
            .orderBy('b.publishedAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async findScheduledToPublish() {
        return this.entityManager
            .getRepository(blog_post_entity_1.BlogPostEntity)
            .createQueryBuilder('b')
            .where('b.status = :status', { status: 'scheduled' })
            .andWhere('b.publishedAt <= :now', { now: new Date() })
            .andWhere('b.isDeleted = false')
            .getMany();
    }
    async findFeatured(tenantId, limit = 5) {
        return this.scopedQb('b', tenantId)
            .andWhere('b.isFeatured = true')
            .andWhere('b.status = :status', { status: 'published' })
            .orderBy('b.publishedAt', 'DESC')
            .take(limit)
            .getMany();
    }
    async searchByText(query, tenantId, page = 1, limit = 20) {
        const term = `%${query.replace(/[%_]/g, '\\$&')}%`;
        const [data, total] = await this.scopedQb('b', tenantId)
            .andWhere('(b.title ILIKE :term OR b.excerpt ILIKE :term OR b.tags ILIKE :term)', { term })
            .orderBy('b.publishedAt', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
    async findRelated(postId, categoryId, tenantId, limit = 4) {
        return this.scopedQb('b', tenantId)
            .andWhere('b.categoryId = :categoryId', { categoryId })
            .andWhere('b.id != :postId', { postId })
            .andWhere('b.status = :status', { status: 'published' })
            .orderBy('b.publishedAt', 'DESC')
            .take(limit)
            .getMany();
    }
    async bulkUpdateStatus(ids, status, tenantId) {
        if (ids.length === 0)
            return 0;
        const result = await this.entityManager
            .createQueryBuilder()
            .update(blog_post_entity_1.BlogPostEntity)
            .set({ status, updatedAt: new Date() })
            .where('id IN (:...ids) AND tenantId = :tenantId AND isDeleted = false', { ids, tenantId })
            .execute();
        return result.affected ?? 0;
    }
    async isSlugTaken(slug, tenantId, excludeId) {
        const qb = this.scopedQb('b', tenantId).andWhere('b.slug = :slug', { slug });
        if (excludeId)
            qb.andWhere('b.id != :excludeId', { excludeId });
        return (await qb.getCount()) > 0;
    }
    async incrementViewCount(id, tenantId) {
        await this.entityManager
            .createQueryBuilder()
            .update(blog_post_entity_1.BlogPostEntity)
            .set({ viewCount: () => '"view_count" + 1' })
            .where('id = :id AND tenantId = :tenantId', { id, tenantId })
            .execute();
    }
    async findPaginated(tenantId, page = 1, limit = 20, alias = 'b') {
        const [data, total] = await this.scopedQb(alias, tenantId)
            .orderBy(`${alias}.publishedAt`, 'DESC')
            .addOrderBy(`${alias}.createdAt`, 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();
        return { data, total };
    }
};
exports.BlogPostRepository = BlogPostRepository;
exports.BlogPostRepository = BlogPostRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BlogPostRepository);
//# sourceMappingURL=blog-post.repository.js.map