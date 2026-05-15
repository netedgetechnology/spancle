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
exports.BlogCategoryRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_aware_repository_1 = require("../../../common/repositories/tenant-aware.repository");
const blog_category_entity_1 = require("../entities/blog-category.entity");
let BlogCategoryRepository = class BlogCategoryRepository extends tenant_aware_repository_1.TenantAwareRepository {
    constructor(dataSource) {
        super(blog_category_entity_1.BlogCategoryEntity, dataSource.manager);
    }
    async findBySlug(slug, tenantId) {
        return this.scopedQb('bc', tenantId)
            .andWhere('bc.slug = :slug', { slug })
            .getOne();
    }
    async isSlugTaken(slug, tenantId, excludeId) {
        const qb = this.scopedQb('bc', tenantId).andWhere('bc.slug = :slug', { slug });
        if (excludeId)
            qb.andWhere('bc.id != :excludeId', { excludeId });
        return (await qb.getCount()) > 0;
    }
    async getPostCounts(tenantId) {
        const rows = await this.entityManager
            .createQueryBuilder()
            .select('b.categoryId', 'categoryId')
            .addSelect('COUNT(b.id)', 'count')
            .from('cms_blog_posts', 'b')
            .where('b.tenantId = :tenantId AND b.isDeleted = false AND b.status = :status', {
            tenantId,
            status: 'published',
        })
            .groupBy('b.categoryId')
            .getRawMany();
        return rows.reduce((acc, row) => {
            if (row.categoryId)
                acc[row.categoryId] = Number(row.count);
            return acc;
        }, {});
    }
};
exports.BlogCategoryRepository = BlogCategoryRepository;
exports.BlogCategoryRepository = BlogCategoryRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BlogCategoryRepository);
//# sourceMappingURL=blog-category.repository.js.map