import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { BlogService } from '../services/blog.service';
import { CreateBlogPostDto, UpdateBlogPostDto, BulkUpdateStatusDto, CreateCategoryDto, UpdateCategoryDto } from '../dto/create-blog-post.dto';
/**
 * BlogController — full CMS blog management API.
 *
 * All routes require:
 *   - Valid x-tenant-id header (TenantGuard — global)
 *   - Authenticated Bearer token (JwtAuthGuard — global)
 *   - AuditInterceptor records every mutating operation
 *
 * Route groups:
 *   POST   /api/v1/cms/blog/posts                        create
 *   GET    /api/v1/cms/blog/posts                        list (paginated, filterable)
 *   GET    /api/v1/cms/blog/posts/featured               featured posts
 *   GET    /api/v1/cms/blog/posts/search?q=              full-text search
 *   GET    /api/v1/cms/blog/posts/by-slug/:slug          resolve by slug
 *   GET    /api/v1/cms/blog/posts/:id                    single post
 *   GET    /api/v1/cms/blog/posts/:id/related            related posts
 *   PATCH  /api/v1/cms/blog/posts/:id                    update
 *   POST   /api/v1/cms/blog/posts/bulk-status            bulk status change
 *   POST   /api/v1/cms/blog/posts/publish-scheduled      trigger scheduled publish
 *   DELETE /api/v1/cms/blog/posts/:id                    soft delete
 *
 *   POST   /api/v1/cms/blog/categories                   create
 *   GET    /api/v1/cms/blog/categories                   list with post counts
 *   GET    /api/v1/cms/blog/categories/:id               single
 *   PATCH  /api/v1/cms/blog/categories/:id               update
 *   DELETE /api/v1/cms/blog/categories/:id               soft delete
 */
export declare class BlogController {
    private readonly blogService;
    constructor(blogService: BlogService);
    createPost(dto: CreateBlogPostDto, tenant: TenantContext): Promise<import("../entities/blog-post.entity").BlogPostEntity>;
    findAllPosts(tenant: TenantContext, page?: string, limit?: string, status?: string, categoryId?: string, search?: string): Promise<{
        data: import("../entities/blog-post.entity").BlogPostEntity[];
        total: number;
    }>;
    /**
     * GET /api/v1/cms/blog/posts/featured
     * Returns isFeatured=true, status=published posts.
     * Used for homepage widgets and related post sidebars.
     * Must be declared before /:id to avoid route shadowing.
     */
    findFeaturedPosts(tenant: TenantContext, limit?: string): Promise<import("../entities/blog-post.entity").BlogPostEntity[]>;
    /**
     * GET /api/v1/cms/blog/posts/search?q=&page=&limit=
     * Full-text ILIKE search across title, excerpt, tags.
     */
    searchPosts(tenant: TenantContext, q?: string, page?: string, limit?: string): Promise<{
        data: import("../entities/blog-post.entity").BlogPostEntity[];
        total: number;
    }>;
    findPostBySlug(slug: string, tenant: TenantContext): Promise<import("../entities/blog-post.entity").BlogPostEntity>;
    findOnePost(id: string, tenant: TenantContext): Promise<import("../entities/blog-post.entity").BlogPostEntity>;
    /**
     * GET /api/v1/cms/blog/posts/:id/related
     * Returns posts in the same category, excluding the source post.
     */
    findRelatedPosts(id: string, tenant: TenantContext, limit?: string): Promise<import("../entities/blog-post.entity").BlogPostEntity[]>;
    updatePost(id: string, dto: UpdateBlogPostDto, tenant: TenantContext): Promise<import("../entities/blog-post.entity").BlogPostEntity>;
    /**
     * POST /api/v1/cms/blog/posts/bulk-status
     * Updates status for up to 100 posts in a single call.
     * Emits one domain event per post.
     */
    bulkUpdateStatus(dto: BulkUpdateStatusDto, tenant: TenantContext): Promise<{
        updated: number;
    }>;
    /**
     * POST /api/v1/cms/blog/posts/publish-scheduled
     * Triggers immediate publish of all due scheduled posts.
     * In production this is called by a cron job (Sprint 2: @nestjs/schedule).
     * Requires SUPER_ADMIN role — not exposed to tenant users.
     * Returns count of posts that were published.
     */
    publishScheduled(): Promise<{
        published: number;
    }>;
    removePost(id: string, tenant: TenantContext): Promise<void>;
    createCategory(dto: CreateCategoryDto, tenant: TenantContext): Promise<import("../entities/blog-category.entity").BlogCategoryEntity>;
    /**
     * GET /api/v1/cms/blog/categories
     * Returns categories with published post count per category.
     */
    findAllCategories(tenant: TenantContext): Promise<(import("../entities/blog-category.entity").BlogCategoryEntity & {
        postCount: number;
    })[]>;
    findOneCategory(id: string, tenant: TenantContext): Promise<import("../entities/blog-category.entity").BlogCategoryEntity>;
    updateCategory(id: string, dto: UpdateCategoryDto, tenant: TenantContext): Promise<import("../entities/blog-category.entity").BlogCategoryEntity>;
    removeCategory(id: string, tenant: TenantContext): Promise<void>;
}
//# sourceMappingURL=blog.controller.d.ts.map