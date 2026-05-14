import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { BlogCategoryEntity } from '../entities/blog-category.entity';
export declare class BlogCategoryRepository extends TenantAwareRepository<BlogCategoryEntity> {
    constructor(dataSource: DataSource);
    findBySlug(slug: string, tenantId: string): Promise<BlogCategoryEntity | null>;
    isSlugTaken(slug: string, tenantId: string, excludeId?: string): Promise<boolean>;
    /**
     * Returns post count per category for the admin UI.
     * Groups published posts by categoryId.
     */
    getPostCounts(tenantId: string): Promise<Record<string, number>>;
}
//# sourceMappingURL=blog-category.repository.d.ts.map