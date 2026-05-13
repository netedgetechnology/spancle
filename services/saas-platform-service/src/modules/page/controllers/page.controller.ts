import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantCtx } from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { PageService } from '../services/page.service';
import { CreatePageDto, UpdatePageDto } from '../dto/create-page.dto';
import type { PageEntity } from '../entities/page.entity';

/**
 * PageController — CMS page management endpoints.
 *
 * All routes require:
 *   - Valid tenant context (TenantGuard via AppModule global guards)
 *   - Authenticated session (JwtAuthGuard via AppModule global guards)
 *
 * Public page retrieval by slug uses @Public() — accessible by the
 * frontend renderer without authentication.
 */
@Controller('cms/pages')
@UseInterceptors(AuditInterceptor)
export class PageController {
  constructor(private readonly pageService: PageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreatePageDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<PageEntity> {
    // actorId resolved from JWT in Sprint 2 — placeholder until CurrentUser wired
    return this.pageService.create(dto, tenant.tenantId, 'system');
  }

  @Get()
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('status') status?: string,
  ): Promise<{ data: PageEntity[]; total: number }> {
    return this.pageService.findAll(
      tenant.tenantId,
      page  ? Number(page)  : 1,
      limit ? Number(limit) : 20,
      status,
    );
  }

  /**
   * GET /cms/pages/homepage
   * Returns the tenant's designated homepage page record.
   * Called by public-website resolvePageId for the root URL.
   * Returns 404 if no homepage page has been set for this tenant.
   */
  @Get('homepage')
  findHomepage(
    @TenantCtx() tenant: TenantContext,
  ): Promise<PageEntity> {
    return this.pageService.findHomepage(tenant.tenantId);
  }

    @Get('by-slug/:slug')
  findBySlug(
    @Param('slug') slug: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<PageEntity> {
    return this.pageService.findBySlug(slug, tenant.tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<PageEntity> {
    return this.pageService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePageDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<PageEntity> {
    return this.pageService.update(id, dto, tenant.tenantId, 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<void> {
    return this.pageService.remove(id, tenant.tenantId, 'system');
  }
}
