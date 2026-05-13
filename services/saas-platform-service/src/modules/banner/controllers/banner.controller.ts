import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantCtx } from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { BannerService } from '../services/banner.service';
import { CreateBannerDto, UpdateBannerDto } from '../dto/create-banner.dto';

@Controller('cms/banners')
@UseInterceptors(AuditInterceptor)
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBannerDto, @TenantCtx() tenant: TenantContext) {
    return this.bannerService.create(dto, tenant.tenantId, 'system');
  }

  @Get()
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('placement') placement?: string,
    @Query('status')    status?:    string,
  ) {
    return this.bannerService.findAll(tenant.tenantId, placement, status);
  }

  @Get('by-key/:key')
  findByKey(@Param('key') key: string, @TenantCtx() tenant: TenantContext) {
    return this.bannerService.findByKey(key, tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.bannerService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBannerDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.bannerService.update(id, dto, tenant.tenantId, 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.bannerService.remove(id, tenant.tenantId, 'system');
  }
}
