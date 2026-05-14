import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { BlogPostEntity, type BlogPostStatus } from '../entities/blog-post.entity';
export declare class BlogPostRepository extends TenantAwareRepository<BlogPostEntity> {
    constructor(dataSource: DataSource);
    findBySlug(slug: string, tenantId: string): Promise<BlogPostEntity | null>;
    findByStatus(status: BlogPostStatus, tenantId: string, page?: number, limit?: number): Promise<{
        data: BlogPostEntity[];
        total: number;
    }>;
    findByCategory(categoryId: string, tenantId: string, page?: number, limit?: number): Promise<{
        data: BlogPostEntity[];
        total: number;
    }>;
    /**
     * Returns all posts with status='scheduled' whose publishedAt has passed.
     * Called by the scheduler task (Sprint 2: @Cron every minute).
     */
    findScheduledToPublish(): Promise<BlogPostEntity[]>;
    /**
     * Returns featured posts for homepage/sidebar widgets.
     */
    findFeatured(tenantId: string, limit?: number): Promise<BlogPostEntity[]>;
    /**
     * Full-text search across title, excerpt and tags.
     * Uses PostgreSQL ILIKE for case-insensitive substring match.
     */
    searchByText(query: string, tenantId: string, page?: number, limit?: number): Promise<{
        data: BlogPostEntity[];
        total: number;
    }>;
    /**
     * Returns posts sharing the same category, excluding the source post.
     * Used for "Related posts" widgets.
     */
    findRelated(postId: string, categoryId: string, tenantId: string, limit?: number): Promise<BlogPostEntity[]>;
    /**
     * Bulk-updates status for a list of post IDs.
     * Validates all IDs belong to the tenant before updating.
     */
    bulkUpdateStatus(ids: string[], status: BlogPostStatus, tenantId: string): Promise<number>;
    isSlugTaken(slug: string, tenantId: string, excludeId?: string): Promise<boolean>;
    incrementViewCount(id: string, tenantId: string): Promise<void>;
    findPaginated(tenantId: string, page?: number, limit?: number, alias?: string): Promise<{
        data: BlogPostEntity[];
        total: number;
    }>;
}
//# sourceMappingURL=blog-post.repository.d.ts.map