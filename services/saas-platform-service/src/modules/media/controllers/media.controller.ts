import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantCtx } from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { MediaService } from '../services/media.service';
import { CreateMediaAssetDto, UpdateMediaAssetDto } from '../dto/create-media-asset.dto';

@Controller('cms/media')
@UseInterceptors(AuditInterceptor)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * POST /api/v1/cms/media/register
   * Registers an already-uploaded file's metadata.
   * File upload (multipart) handled by a dedicated upload endpoint (Sprint 3).
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Body() dto: CreateMediaAssetDto, @TenantCtx() tenant: TenantContext) {
    return this.mediaService.register(dto, tenant.tenantId, 'system');
  }

  @Get()
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('page')      page?:      string,
    @Query('limit')     limit?:     string,
    @Query('assetType') assetType?: string,
  ) {
    return this.mediaService.findAll(
      tenant.tenantId,
      page  ? Number(page)  : 1,
      limit ? Number(limit) : 20,
      assetType,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.mediaService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMediaAssetDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.mediaService.update(id, dto, tenant.tenantId, 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.mediaService.remove(id, tenant.tenantId, 'system');
  }
}
