import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BlogPostRepository } from '../repositories/blog-post.repository';
import { BlogCategoryRepository } from '../repositories/blog-category.repository';
import type { CreateBlogPostDto, UpdateBlogPostDto, BulkUpdateStatusDto, CreateCategoryDto, UpdateCategoryDto } from '../dto/create-blog-post.dto';
import { BlogPostEntity, type BlogPostStatus } from '../entities/blog-post.entity';
import { BlogCategoryEntity } from '../entities/blog-category.entity';
import { BlogEventNames } from '../events/blog.events';
import { SeoFieldsEmbed } from '../../seo/embeds/seo-fields.embed';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(
    private readonly postRepository:     BlogPostRepository,
    private readonly categoryRepository: BlogCategoryRepository,
    private readonly eventEmitter:       EventEmitter2,
  ) {}

  // ── Posts ──────────────────────────────────────────────────────────────────

  async createPost(dto: CreateBlogPostDto, tenantId: string, actorId: string): Promise<BlogPostEntity> {
    const slugTaken = await this.postRepository.isSlugTaken(dto.slug, tenantId);
    if (slugTaken) throw new ConflictException(`Blog post slug "${dto.slug}" already exists`);

    const status = dto.status ?? 'draft';

    // Validate scheduling: scheduled posts must have a future publishedAt
    if (status === 'scheduled') {
      if (!dto.publishedAt) throw new BadRequestException('Scheduled posts require a publishedAt date');
      if (new Date(dto.publishedAt) <= new Date()) {
        throw new BadRequestException('Scheduled publishedAt must be in the future');
      }
    }

    const entity = await this.postRepository.insert(
      {
        ...dto,
        tenantId,
        authorId:           actorId,
        lastEditedBy:       actorId,
        publishedAt:        dto.publishedAt ? new Date(dto.publishedAt) : null,
        status,
        readingTimeMinutes: this.estimateReadingTime(dto.content),
        seo: dto.seo ? Object.assign(new SeoFieldsEmbed(), dto.seo) : new SeoFieldsEmbed(),
      } as unknown as Parameters<typeof this.postRepository.insert>[0],
      tenantId,
    );

    const eventName = status === 'scheduled'
      ? BlogEventNames.POST_SCHEDULED
      : BlogEventNames.POST_CREATED;

    await this.eventEmitter.emitAsync(eventName, {
      tenantId, postId: entity.id, actorId, slug: entity.slug,
      ...(status === 'scheduled' && { scheduledFor: dto.publishedAt }),
      timestamp: new Date().toISOString(),
    });
    return entity;
  }

  async findAllPosts(
    tenantId: string,
    page = 1,
    limit = 20,
    status?: string,
    categoryId?: string,
    search?: string,
  ): Promise<{ data: BlogPostEntity[]; total: number }> {
    if (search)     return this.postRepository.searchByText(search, tenantId, page, limit);
    if (categoryId) return this.postRepository.findByCategory(categoryId, tenantId, page, limit);
    if (status)     return this.postRepository.findByStatus(status as BlogPostStatus, tenantId, page, limit);
    return this.postRepository.findPaginated(tenantId, page, limit, 'b');
  }

  async findOnePost(id: string, tenantId: string): Promise<BlogPostEntity> {
    return this.postRepository.findByIdOrFail(id, tenantId);
  }

  async findPostBySlug(slug: string, tenantId: string): Promise<BlogPostEntity> {
    const post = await this.postRepository.findBySlug(slug, tenantId);
    if (!post) throw new NotFoundException(`Blog post "${slug}" not found`);
    return post;
  }

  async findFeaturedPosts(tenantId: string, limit = 5): Promise<BlogPostEntity[]> {
    return this.postRepository.findFeatured(tenantId, limit);
  }

  async findRelatedPosts(postId: string, tenantId: string, limit = 4): Promise<BlogPostEntity[]> {
    const post = await this.postRepository.findByIdOrFail(postId, tenantId);
    if (!post.categoryId) return [];
    return this.postRepository.findRelated(postId, post.categoryId, tenantId, limit);
  }

  async updatePost(id: string, dto: UpdateBlogPostDto, tenantId: string, actorId: string): Promise<BlogPostEntity> {
    const existing = await this.postRepository.findByIdOrFail(id, tenantId);

    if (dto.slug) {
      const taken = await this.postRepository.isSlugTaken(dto.slug, tenantId, id);
      if (taken) throw new ConflictException(`Blog post slug "${dto.slug}" already exists`);
    }

    // Validate scheduling transition
    const newStatus = dto.status;
    if (newStatus === 'scheduled') {
      const scheduledDate = dto.publishedAt ? new Date(dto.publishedAt) : existing.publishedAt;
      if (!scheduledDate) throw new BadRequestException('Scheduled posts require a publishedAt date');
      if (scheduledDate <= new Date()) throw new BadRequestException('Scheduled publishedAt must be in the future');
    }

    const updated = await this.postRepository.updateById(
      id,
      {
        ...dto,
        lastEditedBy:       actorId,
        publishedAt:        dto.publishedAt ? new Date(dto.publishedAt) : undefined,
        readingTimeMinutes: dto.content ? this.estimateReadingTime(dto.content) : undefined,
      } as unknown as Parameters<typeof this.postRepository.updateById>[1],
      tenantId,
    );

    const eventName = newStatus === 'published'
      ? BlogEventNames.POST_PUBLISHED
      : newStatus === 'scheduled'
        ? BlogEventNames.POST_SCHEDULED
        : newStatus === 'archived'
          ? BlogEventNames.POST_ARCHIVED
          : BlogEventNames.POST_UPDATED;

    await this.eventEmitter.emitAsync(eventName, {
      tenantId, postId: id, actorId, slug: updated.slug,
      ...(newStatus === 'scheduled' && { scheduledFor: dto.publishedAt }),
      timestamp: new Date().toISOString(),
    });
    return updated;
  }

  /**
   * Bulk-updates the status of multiple posts.
   * Each post emits its own event — no aggregate events.
   * Sprint 2: wrap in a queue job for large batches.
   */
  async bulkUpdateStatus(dto: BulkUpdateStatusDto, tenantId: string, actorId: string): Promise<number> {
    // Validate all IDs belong to this tenant before updating
    for (const id of dto.ids) {
      await this.postRepository.findByIdOrFail(id, tenantId);
    }

    const count = await this.postRepository.bulkUpdateStatus(dto.ids, dto.status, tenantId);

    const eventName = dto.status === 'published'
      ? BlogEventNames.POST_PUBLISHED
      : dto.status === 'archived'
        ? BlogEventNames.POST_ARCHIVED
        : BlogEventNames.POST_UPDATED;

    for (const id of dto.ids) {
      await this.eventEmitter.emitAsync(eventName, {
        tenantId, postId: id, actorId, timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Bulk status update: ${count} posts → ${dto.status} by ${actorId} tenant=${tenantId}`);
    return count;
  }

  /**
   * Publishes all scheduled posts whose publishedAt has passed.
   * Called by a @Cron() task in Sprint 2.
   * Safe to call concurrently — uses status='scheduled' guard.
   */
  async publishScheduled(): Promise<number> {
    const due = await this.postRepository.findScheduledToPublish();
    if (due.length === 0) return 0;

    for (const post of due) {
      await this.postRepository.updateById(
        post.id,
        { status: 'published' } as unknown as Parameters<typeof this.postRepository.updateById>[1],
        post.tenantId,
      );
      await this.eventEmitter.emitAsync(BlogEventNames.POST_PUBLISHED, {
        tenantId:  post.tenantId,
        postId:    post.id,
        actorId:   'scheduler',
        slug:      post.slug,
        timestamp: new Date().toISOString(),
      });
    }

    this.logger.log(`Auto-published ${due.length} scheduled post(s)`);
    return due.length;
  }

  async removePost(id: string, tenantId: string, actorId: string): Promise<void> {
    await this.postRepository.findByIdOrFail(id, tenantId);
    await this.postRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(BlogEventNames.POST_DELETED, {
      tenantId, postId: id, actorId, timestamp: new Date().toISOString(),
    });
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  async createCategory(dto: CreateCategoryDto, tenantId: string, actorId: string): Promise<BlogCategoryEntity> {
    const slugTaken = await this.categoryRepository.isSlugTaken(dto.slug, tenantId);
    if (slugTaken) throw new ConflictException(`Category slug "${dto.slug}" already exists`);

    const entity = await this.categoryRepository.insert(
      { ...dto, tenantId } as unknown as Parameters<typeof this.categoryRepository.insert>[0],
      tenantId,
    );

    await this.eventEmitter.emitAsync(BlogEventNames.CATEGORY_CREATED, {
      tenantId, categoryId: entity.id, actorId, timestamp: new Date().toISOString(),
    });
    return entity;
  }

  async findAllCategories(tenantId: string): Promise<BlogCategoryEntity[]> {
    return this.categoryRepository.findAll(tenantId);
  }

  async findOneCategory(id: string, tenantId: string): Promise<BlogCategoryEntity> {
    return this.categoryRepository.findByIdOrFail(id, tenantId);
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, tenantId: string, actorId: string): Promise<BlogCategoryEntity> {
    await this.categoryRepository.findByIdOrFail(id, tenantId);

    if (dto.slug) {
      const taken = await this.categoryRepository.isSlugTaken(dto.slug, tenantId, id);
      if (taken) throw new ConflictException(`Category slug "${dto.slug}" already exists`);
    }

    const updated = await this.categoryRepository.updateById(
      id,
      dto as unknown as Parameters<typeof this.categoryRepository.updateById>[1],
      tenantId,
    );

    await this.eventEmitter.emitAsync(BlogEventNames.CATEGORY_UPDATED, {
      tenantId, categoryId: id, actorId, timestamp: new Date().toISOString(),
    });
    return updated;
  }

  async removeCategory(id: string, tenantId: string, actorId: string): Promise<void> {
    await this.categoryRepository.findByIdOrFail(id, tenantId);
    await this.categoryRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(BlogEventNames.CATEGORY_DELETED, {
      tenantId, categoryId: id, actorId, timestamp: new Date().toISOString(),
    });
  }

  async getCategoriesWithCounts(
    tenantId: string,
  ): Promise<Array<BlogCategoryEntity & { postCount: number }>> {
    const [categories, counts] = await Promise.all([
      this.categoryRepository.findAll(tenantId),
      this.categoryRepository.getPostCounts(tenantId),
    ]);
    return categories.map((c) => Object.assign(c, { postCount: counts[c.id] ?? 0 }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private estimateReadingTime(content?: Record<string, unknown> | null): number {
    if (!content) return 1;
    const text      = JSON.stringify(content);
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }
}
