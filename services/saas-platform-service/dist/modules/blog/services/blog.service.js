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
var BlogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const blog_post_repository_1 = require("../repositories/blog-post.repository");
const blog_category_repository_1 = require("../repositories/blog-category.repository");
const blog_events_1 = require("../events/blog.events");
const seo_fields_embed_1 = require("../../seo/embeds/seo-fields.embed");
let BlogService = BlogService_1 = class BlogService {
    constructor(postRepository, categoryRepository, eventEmitter) {
        this.postRepository = postRepository;
        this.categoryRepository = categoryRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(BlogService_1.name);
    }
    // ── Posts ──────────────────────────────────────────────────────────────────
    async createPost(dto, tenantId, actorId) {
        const slugTaken = await this.postRepository.isSlugTaken(dto.slug, tenantId);
        if (slugTaken)
            throw new common_1.ConflictException(`Blog post slug "${dto.slug}" already exists`);
        const status = dto.status ?? 'draft';
        // Validate scheduling: scheduled posts must have a future publishedAt
        if (status === 'scheduled') {
            if (!dto.publishedAt)
                throw new common_1.BadRequestException('Scheduled posts require a publishedAt date');
            if (new Date(dto.publishedAt) <= new Date()) {
                throw new common_1.BadRequestException('Scheduled publishedAt must be in the future');
            }
        }
        const entity = await this.postRepository.insert({
            ...dto,
            tenantId,
            authorId: actorId,
            lastEditedBy: actorId,
            publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
            status,
            readingTimeMinutes: this.estimateReadingTime(dto.content),
            seo: dto.seo ? Object.assign(new seo_fields_embed_1.SeoFieldsEmbed(), dto.seo) : new seo_fields_embed_1.SeoFieldsEmbed(),
        }, tenantId);
        const eventName = status === 'scheduled'
            ? blog_events_1.BlogEventNames.POST_SCHEDULED
            : blog_events_1.BlogEventNames.POST_CREATED;
        await this.eventEmitter.emitAsync(eventName, {
            tenantId, postId: entity.id, actorId, slug: entity.slug,
            ...(status === 'scheduled' && { scheduledFor: dto.publishedAt }),
            timestamp: new Date().toISOString(),
        });
        return entity;
    }
    async findAllPosts(tenantId, page = 1, limit = 20, status, categoryId, search) {
        if (search)
            return this.postRepository.searchByText(search, tenantId, page, limit);
        if (categoryId)
            return this.postRepository.findByCategory(categoryId, tenantId, page, limit);
        if (status)
            return this.postRepository.findByStatus(status, tenantId, page, limit);
        return this.postRepository.findPaginated(tenantId, page, limit, 'b');
    }
    async findOnePost(id, tenantId) {
        return this.postRepository.findByIdOrFail(id, tenantId);
    }
    async findPostBySlug(slug, tenantId) {
        const post = await this.postRepository.findBySlug(slug, tenantId);
        if (!post)
            throw new common_1.NotFoundException(`Blog post "${slug}" not found`);
        return post;
    }
    async findFeaturedPosts(tenantId, limit = 5) {
        return this.postRepository.findFeatured(tenantId, limit);
    }
    async findRelatedPosts(postId, tenantId, limit = 4) {
        const post = await this.postRepository.findByIdOrFail(postId, tenantId);
        if (!post.categoryId)
            return [];
        return this.postRepository.findRelated(postId, post.categoryId, tenantId, limit);
    }
    async updatePost(id, dto, tenantId, actorId) {
        const existing = await this.postRepository.findByIdOrFail(id, tenantId);
        if (dto.slug) {
            const taken = await this.postRepository.isSlugTaken(dto.slug, tenantId, id);
            if (taken)
                throw new common_1.ConflictException(`Blog post slug "${dto.slug}" already exists`);
        }
        // Validate scheduling transition
        const newStatus = dto.status;
        if (newStatus === 'scheduled') {
            const scheduledDate = dto.publishedAt ? new Date(dto.publishedAt) : existing.publishedAt;
            if (!scheduledDate)
                throw new common_1.BadRequestException('Scheduled posts require a publishedAt date');
            if (scheduledDate <= new Date())
                throw new common_1.BadRequestException('Scheduled publishedAt must be in the future');
        }
        const updated = await this.postRepository.updateById(id, {
            ...dto,
            lastEditedBy: actorId,
            publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : undefined,
            readingTimeMinutes: dto.content ? this.estimateReadingTime(dto.content) : undefined,
        }, tenantId);
        const eventName = newStatus === 'published'
            ? blog_events_1.BlogEventNames.POST_PUBLISHED
            : newStatus === 'scheduled'
                ? blog_events_1.BlogEventNames.POST_SCHEDULED
                : newStatus === 'archived'
                    ? blog_events_1.BlogEventNames.POST_ARCHIVED
                    : blog_events_1.BlogEventNames.POST_UPDATED;
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
    async bulkUpdateStatus(dto, tenantId, actorId) {
        // Validate all IDs belong to this tenant before updating
        for (const id of dto.ids) {
            await this.postRepository.findByIdOrFail(id, tenantId);
        }
        const count = await this.postRepository.bulkUpdateStatus(dto.ids, dto.status, tenantId);
        const eventName = dto.status === 'published'
            ? blog_events_1.BlogEventNames.POST_PUBLISHED
            : dto.status === 'archived'
                ? blog_events_1.BlogEventNames.POST_ARCHIVED
                : blog_events_1.BlogEventNames.POST_UPDATED;
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
    async publishScheduled() {
        const due = await this.postRepository.findScheduledToPublish();
        if (due.length === 0)
            return 0;
        for (const post of due) {
            await this.postRepository.updateById(post.id, { status: 'published' }, post.tenantId);
            await this.eventEmitter.emitAsync(blog_events_1.BlogEventNames.POST_PUBLISHED, {
                tenantId: post.tenantId,
                postId: post.id,
                actorId: 'scheduler',
                slug: post.slug,
                timestamp: new Date().toISOString(),
            });
        }
        this.logger.log(`Auto-published ${due.length} scheduled post(s)`);
        return due.length;
    }
    async removePost(id, tenantId, actorId) {
        await this.postRepository.findByIdOrFail(id, tenantId);
        await this.postRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(blog_events_1.BlogEventNames.POST_DELETED, {
            tenantId, postId: id, actorId, timestamp: new Date().toISOString(),
        });
    }
    // ── Categories ─────────────────────────────────────────────────────────────
    async createCategory(dto, tenantId, actorId) {
        const slugTaken = await this.categoryRepository.isSlugTaken(dto.slug, tenantId);
        if (slugTaken)
            throw new common_1.ConflictException(`Category slug "${dto.slug}" already exists`);
        const entity = await this.categoryRepository.insert({ ...dto, tenantId }, tenantId);
        await this.eventEmitter.emitAsync(blog_events_1.BlogEventNames.CATEGORY_CREATED, {
            tenantId, categoryId: entity.id, actorId, timestamp: new Date().toISOString(),
        });
        return entity;
    }
    async findAllCategories(tenantId) {
        return this.categoryRepository.findAll(tenantId);
    }
    async findOneCategory(id, tenantId) {
        return this.categoryRepository.findByIdOrFail(id, tenantId);
    }
    async updateCategory(id, dto, tenantId, actorId) {
        await this.categoryRepository.findByIdOrFail(id, tenantId);
        if (dto.slug) {
            const taken = await this.categoryRepository.isSlugTaken(dto.slug, tenantId, id);
            if (taken)
                throw new common_1.ConflictException(`Category slug "${dto.slug}" already exists`);
        }
        const updated = await this.categoryRepository.updateById(id, dto, tenantId);
        await this.eventEmitter.emitAsync(blog_events_1.BlogEventNames.CATEGORY_UPDATED, {
            tenantId, categoryId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async removeCategory(id, tenantId, actorId) {
        await this.categoryRepository.findByIdOrFail(id, tenantId);
        await this.categoryRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(blog_events_1.BlogEventNames.CATEGORY_DELETED, {
            tenantId, categoryId: id, actorId, timestamp: new Date().toISOString(),
        });
    }
    async getCategoriesWithCounts(tenantId) {
        const [categories, counts] = await Promise.all([
            this.categoryRepository.findAll(tenantId),
            this.categoryRepository.getPostCounts(tenantId),
        ]);
        return categories.map((c) => Object.assign(c, { postCount: counts[c.id] ?? 0 }));
    }
    // ── Helpers ────────────────────────────────────────────────────────────────
    estimateReadingTime(content) {
        if (!content)
            return 1;
        const text = JSON.stringify(content);
        const wordCount = text.split(/\s+/).length;
        return Math.max(1, Math.ceil(wordCount / 200));
    }
};
exports.BlogService = BlogService;
exports.BlogService = BlogService = BlogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [blog_post_repository_1.BlogPostRepository,
        blog_category_repository_1.BlogCategoryRepository,
        event_emitter_1.EventEmitter2])
], BlogService);
//# sourceMappingURL=blog.service.js.map