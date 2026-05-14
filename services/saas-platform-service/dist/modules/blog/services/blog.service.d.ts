import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlogPostRepository } from '../repositories/blog-post.repository';
import { BlogCategoryRepository } from '../repositories/blog-category.repository';
import type { CreateBlogPostDto, UpdateBlogPostDto, BulkUpdateStatusDto, CreateCategoryDto, UpdateCategoryDto } from '../dto/create-blog-post.dto';
import { BlogPostEntity } from '../entities/blog-post.entity';
import { BlogCategoryEntity } from '../entities/blog-category.entity';
export declare class BlogService {
    private readonly postRepository;
    private readonly categoryRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(postRepository: BlogPostRepository, categoryRepository: BlogCategoryRepository, eventEmitter: EventEmitter2);
    createPost(dto: CreateBlogPostDto, tenantId: string, actorId: string): Promise<BlogPostEntity>;
    findAllPosts(tenantId: string, page?: number, limit?: number, status?: string, categoryId?: string, search?: string): Promise<{
        data: BlogPostEntity[];
        total: number;
    }>;
    findOnePost(id: string, tenantId: string): Promise<BlogPostEntity>;
    findPostBySlug(slug: string, tenantId: string): Promise<BlogPostEntity>;
    findFeaturedPosts(tenantId: string, limit?: number): Promise<BlogPostEntity[]>;
    findRelatedPosts(postId: string, tenantId: string, limit?: number): Promise<BlogPostEntity[]>;
    updatePost(id: string, dto: UpdateBlogPostDto, tenantId: string, actorId: string): Promise<BlogPostEntity>;
    /**
     * Bulk-updates the status of multiple posts.
     * Each post emits its own event — no aggregate events.
     * Sprint 2: wrap in a queue job for large batches.
     */
    bulkUpdateStatus(dto: BulkUpdateStatusDto, tenantId: string, actorId: string): Promise<number>;
    /**
     * Publishes all scheduled posts whose publishedAt has passed.
     * Called by a @Cron() task in Sprint 2.
     * Safe to call concurrently — uses status='scheduled' guard.
     */
    publishScheduled(): Promise<number>;
    removePost(id: string, tenantId: string, actorId: string): Promise<void>;
    createCategory(dto: CreateCategoryDto, tenantId: string, actorId: string): Promise<BlogCategoryEntity>;
    findAllCategories(tenantId: string): Promise<BlogCategoryEntity[]>;
    findOneCategory(id: string, tenantId: string): Promise<BlogCategoryEntity>;
    updateCategory(id: string, dto: UpdateCategoryDto, tenantId: string, actorId: string): Promise<BlogCategoryEntity>;
    removeCategory(id: string, tenantId: string, actorId: string): Promise<void>;
    getCategoriesWithCounts(tenantId: string): Promise<Array<BlogCategoryEntity & {
        postCount: number;
    }>>;
    private estimateReadingTime;
}
//# sourceMappingURL=blog.service.d.ts.map