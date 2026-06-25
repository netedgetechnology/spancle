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
  Req,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuditInterceptor }  from '../../../common/interceptors/audit.interceptor';
import { Public }         from '../../../common/decorators/roles.decorator';
import { TenantCtx }         from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { HomepageService }   from '../services/homepage.service';
import {
  CreateHomepageSectionDto,
  UpdateHomepageSectionDto,
  ReorderSectionsDto,
  CloneSectionDto,
} from '../dto/create-homepage-section.dto';
import type { HomepageSectionEntity } from '../entities/homepage-section.entity';

/**
 * HomepageController — section builder API.
 *
 * Public renderer endpoint (no JWT):
 *   GET /api/v1/cms/homepage/pages/:pageId/sections/published
 *   Tenant resolved from: request.tenant?.tenantId → request.tenantId → x-tenant-id header
 *
 * Admin endpoints (require tenant auth via AppModule global guards):
 *   GET    /api/v1/cms/homepage/pages/:pageId/sections
 *   GET    /api/v1/cms/homepage/sections/:id
 *   POST   /api/v1/cms/homepage/sections
 *   PATCH  /api/v1/cms/homepage/sections/:id
 *   DELETE /api/v1/cms/homepage/sections/:id
 *   POST   /api/v1/cms/homepage/sections/reorder
 *   POST   /api/v1/cms/homepage/sections/:id/clone
 *   POST   /api/v1/cms/homepage/pages/:pageId/publish-all
 */
@Controller('cms/homepage')
@UseInterceptors(AuditInterceptor)
export class HomepageController {
  constructor(private readonly homepageService: HomepageService) {}

  // ── Public renderer endpoint ──────────────────────────────────────────────

  /**
   * Returns published, visible sections for a page.
   * Consumed by public-website Next.js SSR.
   * No JWT required — tenant resolved from request or x-tenant-id header.
   */
  @Get('pages/:pageId/sections/published')
  @Public()
  getPublished(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Req() req: Request & { tenant?: TenantContext; tenantId?: string },
  ): Promise<HomepageSectionEntity[]> {
    const tenantId =
      req.tenant?.tenantId ??
      req.tenantId ??
      (req.headers['x-tenant-id'] as string | undefined) ??
      '';

    return this.homepageService.getPublishedSections(pageId, tenantId);
  }

  // ── Admin editor endpoints ────────────────────────────────────────────────

  /**
   * Returns all sections (draft + published + archived) for the admin editor.
   */
  @Get('pages/:pageId/sections')
  getAllForAdmin(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<HomepageSectionEntity[]> {
    return this.homepageService.getAllSections(pageId, tenant.tenantId);
  }

  @Get('sections/:id')
  getOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<HomepageSectionEntity> {
    return this.homepageService.getSection(id, tenant.tenantId);
  }

  @Post('sections')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateHomepageSectionDto,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ): Promise<HomepageSectionEntity> {
    return this.homepageService.createSection(dto, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
  }

  @Patch('sections/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateHomepageSectionDto,
    @TenantCtx() tenant: TenantContext,
    @Req() req: Request & { user?: { userId: string } },
  ): Promise<HomepageSectionEntity> {
    return this.homepageService.updateSection(id, dto, tenant.tenantId, req.user?.userId ?? tenant.tenantId);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<void> {
    return this.homepageService.removeSection(id, tenant.tenantId, 'system');
  }

  /**
   * Reorders all sections after drag-and-drop in the admin UI.
   */
  @Post('sections/reorder')
  @HttpCode(HttpStatus.OK)
  reorder(
    @Body() dto: ReorderSectionsDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<HomepageSectionEntity[]> {
    return this.homepageService.reorderSections(dto, tenant.tenantId, 'system');
  }

  /**
   * Clones a section — creates a draft copy with a new admin label.
   */
  @Post('sections/:id/clone')
  @HttpCode(HttpStatus.CREATED)
  clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneSectionDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<HomepageSectionEntity> {
    return this.homepageService.cloneSection(id, dto, tenant.tenantId, 'system');
  }

  /**
   * Publishes all draft sections for a page in one operation.
   */
  @Post('pages/:pageId/publish-all')
  @HttpCode(HttpStatus.OK)
  publishAll(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<{ published: number }> {
    return this.homepageService
      .publishAllDrafts(pageId, tenant.tenantId, 'system')
      .then((published) => ({ published }));
  }
}
