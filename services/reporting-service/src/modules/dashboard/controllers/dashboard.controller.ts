import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../dashboard/guards/dashboard.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { DashboardService } from '../services/dashboard.service';
import { CreateDashboardDto } from '../dto/create-dashboard.dto';
import { UpdateDashboardDto } from '../dto/update-dashboard.dto';

@Controller('dashboards')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Post()
  create(@Body() dto: CreateDashboardDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.dashboardService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.dashboardService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.dashboardService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDashboardDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.dashboardService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.dashboardService.remove(id, tenant.tenantId);
  }
}
