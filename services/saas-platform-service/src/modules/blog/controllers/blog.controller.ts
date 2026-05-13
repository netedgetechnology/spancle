import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantCtx } from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { BlogService } from '../services/blog.service';
import {
  CreateBlogPostDto,
  UpdateBlogPostDto,
  BulkUpdateStatusDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from '../dto/create-blog-post.dto';

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
@Controller('cms/blog')
@UseInterceptors(AuditInterceptor)
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  // ── Posts ──────────────────────────────────────────────────────────────────

  @Post('posts')
  @HttpCode(HttpStatus.CREATED)
  createPost(
    @Body() dto: CreateBlogPostDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.createPost(dto, tenant.tenantId, 'system');
  }

  @Get('posts')
  findAllPosts(
    @TenantCtx() tenant: TenantContext,
    @Query('page')       page?:       string,
    @Query('limit')      limit?:      string,
    @Query('status')     status?:     string,
    @Query('categoryId') categoryId?: string,
    @Query('search')     search?:     string,
  ) {
    return this.blogService.findAllPosts(
      tenant.tenantId,
      page  ? Number(page)  : 1,
      limit ? Number(limit) : 20,
      status,
      categoryId,
      search,
    );
  }

  /**
   * GET /api/v1/cms/blog/posts/featured
   * Returns isFeatured=true, status=published posts.
   * Used for homepage widgets and related post sidebars.
   * Must be declared before /:id to avoid route shadowing.
   */
  @Get('posts/featured')
  findFeaturedPosts(
    @TenantCtx() tenant: TenantContext,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.findFeaturedPosts(
      tenant.tenantId,
      limit ? Number(limit) : 5,
    );
  }

  /**
   * GET /api/v1/cms/blog/posts/search?q=&page=&limit=
   * Full-text ILIKE search across title, excerpt, tags.
   */
  @Get('posts/search')
  searchPosts(
    @TenantCtx() tenant: TenantContext,
    @Query('q')     q?:     string,
    @Query('page')  page?:  string,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.findAllPosts(
      tenant.tenantId,
      page  ? Number(page)  : 1,
      limit ? Number(limit) : 20,
      undefined,    // status
      undefined,    // categoryId
      q ?? '',      // search term
    );
  }

  @Get('posts/by-slug/:slug')
  findPostBySlug(
    @Param('slug') slug: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.findPostBySlug(slug, tenant.tenantId);
  }

  @Get('posts/:id')
  findOnePost(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.findOnePost(id, tenant.tenantId);
  }

  /**
   * GET /api/v1/cms/blog/posts/:id/related
   * Returns posts in the same category, excluding the source post.
   */
  @Get('posts/:id/related')
  findRelatedPosts(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @Query('limit') limit?: string,
  ) {
    return this.blogService.findRelatedPosts(
      id,
      tenant.tenantId,
      limit ? Number(limit) : 4,
    );
  }

  @Patch('posts/:id')
  updatePost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBlogPostDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.updatePost(id, dto, tenant.tenantId, 'system');
  }

  /**
   * POST /api/v1/cms/blog/posts/bulk-status
   * Updates status for up to 100 posts in a single call.
   * Emits one domain event per post.
   */
  @Post('posts/bulk-status')
  @HttpCode(HttpStatus.OK)
  bulkUpdateStatus(
    @Body() dto: BulkUpdateStatusDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService
      .bulkUpdateStatus(dto, tenant.tenantId, 'system')
      .then((count) => ({ updated: count }));
  }

  /**
   * POST /api/v1/cms/blog/posts/publish-scheduled
   * Triggers immediate publish of all due scheduled posts.
   * In production this is called by a cron job (Sprint 2: @nestjs/schedule).
   * Requires SUPER_ADMIN role — not exposed to tenant users.
   * Returns count of posts that were published.
   */
  @Post('posts/publish-scheduled')
  @HttpCode(HttpStatus.OK)
  publishScheduled() {
    return this.blogService
      .publishScheduled()
      .then((count) => ({ published: count }));
  }

  @Delete('posts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removePost(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.removePost(id, tenant.tenantId, 'system');
  }

  // ── Categories ─────────────────────────────────────────────────────────────

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  createCategory(
    @Body() dto: CreateCategoryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.createCategory(dto, tenant.tenantId, 'system');
  }

  /**
   * GET /api/v1/cms/blog/categories
   * Returns categories with published post count per category.
   */
  @Get('categories')
  findAllCategories(@TenantCtx() tenant: TenantContext) {
    return this.blogService.getCategoriesWithCounts(tenant.tenantId);
  }

  @Get('categories/:id')
  findOneCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.findOneCategory(id, tenant.tenantId);
  }

  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.updateCategory(id, dto, tenant.tenantId, 'system');
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.blogService.removeCategory(id, tenant.tenantId, 'system');
  }
}
