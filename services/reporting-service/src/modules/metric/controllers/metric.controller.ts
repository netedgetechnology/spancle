import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, ParseUUIDPipe, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../metric/guards/metric.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { MetricService } from '../services/metric.service';
import { CreateMetricDto } from '../dto/create-metric.dto';
import { UpdateMetricDto } from '../dto/update-metric.dto';

@Controller('metrics')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class MetricController {
  constructor(private readonly metricService: MetricService) {}

  @Post()
  create(@Body() dto: CreateMetricDto, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.metricService.create(dto, tenant.tenantId);
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.metricService.findAll(tenant.tenantId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.metricService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMetricDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.metricService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext): Promise<void> {
    return this.metricService.remove(id, tenant.tenantId);
  }
}
