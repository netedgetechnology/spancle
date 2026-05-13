import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../tenant/guards/tenant.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { UpdateTenantDto } from '../dto/update-tenant.dto';

@Controller('tenants')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  create(@Body() dto: CreateTenantDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.tenantService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.tenantService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.tenantService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.tenantService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.tenantService.remove(id, tenant.tenantId);
  }
}
