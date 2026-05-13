import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { Roles, Public } from '../../../common/decorators/roles.decorator';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { TenantGuard }      from '../guards/slot.guard';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { HolidayService }   from '../services/holiday.service';
import type { HolidayEntity } from '../entities/holiday.entity';

@Controller('holidays')
@UseGuards(TenantGuard)
@UseInterceptors(AuditInterceptor)
export class HolidayController {
  constructor(private readonly holidayService: HolidayService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: Partial<HolidayEntity>, @TenantCtx() tenant: TenantContext) {
    return this.holidayService.create(dto, tenant.tenantId, 'system');
  }

  @Post('seed-system')
  @HttpCode(HttpStatus.OK)
  seedSystem(@TenantCtx() tenant: TenantContext) {
    return this.holidayService.seedSystemHolidays(tenant.tenantId, 'system');
  }

  @Get()
  findAll(@TenantCtx() tenant: TenantContext) {
    return this.holidayService.findAll(tenant.tenantId);
  }

  @Get('check')
  checkDate(@Query('date') date: string, @TenantCtx() tenant: TenantContext) {
    return this.holidayService.isHoliday(tenant.tenantId, date);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.holidayService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<HolidayEntity>,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.holidayService.update(id, dto, tenant.tenantId, 'system');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @TenantCtx() tenant: TenantContext) {
    return this.holidayService.remove(id, tenant.tenantId, 'system');
  }
}
