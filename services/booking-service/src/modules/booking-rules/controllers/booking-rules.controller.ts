import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }      from '../../../common/decorators/tenant.decorator';
import { Roles }                              from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                   from '../../../common/interceptors/audit.interceptor';
import { TenantGuard, RbacGuard }             from '../../booking/guards/booking.guard';
import { BookingRulesService }                from '../services/booking-rules.service';
import { CreateBookingRulesDto, UpdateBookingRulesDto } from '../dto/booking-rules.dto';

/**
 * BookingRulesController
 *
 * Route prefix: /api/v1/booking-rules
 *
 * RBAC matrix:
 *   POST   /               TENANT_ADMIN
 *   GET    /               TENANT_ADMIN, TENANT_MANAGER
 *   GET    /:id            TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id            TENANT_ADMIN
 *   DELETE /:id            TENANT_ADMIN
 */
@Controller('booking-rules')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class BookingRulesController {
  constructor(private readonly rulesService: BookingRulesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN')
  create(
    @Body() dto: CreateBookingRulesDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.rulesService.create(dto, tenant.tenantId);
  }

  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(@TenantCtx() tenant: TenantContext) {
    return this.rulesService.findAll(tenant.tenantId);
  }

  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.rulesService.findOne(id, tenant.tenantId);
  }

  @Patch(':id')
  @Roles('TENANT_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBookingRulesDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.rulesService.update(id, dto, tenant.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.rulesService.remove(id, tenant.tenantId);
  }
}
