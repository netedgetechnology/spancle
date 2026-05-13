import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post,
  UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantCtx } from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { MenuService } from '../services/menu.service';
import {
  CreateMenuDto, UpdateMenuDto,
  CreateMenuItemDto, UpdateMenuItemDto,
} from '../dto/create-menu.dto';

@Controller('cms/menus')
@UseInterceptors(AuditInterceptor)
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // ── Menus ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateMenuDto, @TenantCtx() tenant: TenantContext) {
    return this.menuService.create(dto, tenant.tenantId, 'system');
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext) {
    return this.menuService.findAll(tenant.tenantId);
  }

  @Get('by-handle/:handle')
  findByHandle(@Param('handle') handle: string, @TenantCtx() tenant: TenantContext) {
    return this.menuService.findByHandle(handle, tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.menuService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMenuDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.menuService.update(id, dto, tenant.tenantId, 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.menuService.remove(id, tenant.tenantId, 'system');
  }

  // ── Menu Items ─────────────────────────────────────────────────────────────

  @Get(':id/items')
  getItems(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.menuService.getItems(id, tenant.tenantId);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMenuItemDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.menuService.addItem(id, dto, tenant.tenantId, 'system');
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Param('id', ParseUUIDPipe)     id:     string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateMenuItemDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.menuService.updateItem(itemId, dto, tenant.tenantId, 'system');
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @Param('id', ParseUUIDPipe)     _id:    string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.menuService.removeItem(itemId, tenant.tenantId, 'system');
  }
}
