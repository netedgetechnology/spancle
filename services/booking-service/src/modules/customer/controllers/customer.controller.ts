import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }        from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { Roles }                                 from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                      from '../../../common/interceptors/audit.interceptor';
import { TenantGuard, RbacGuard }                from '../../booking/guards/booking.guard';
import { CustomerService }                       from '../services/customer.service';
import { CreateCustomerDto, UpdateCustomerDto, CustomerQueryDto } from '../dto/customer.dto';

/**
 * CustomerController
 *
 * Route prefix: /api/v1/customers
 *
 * RBAC matrix:
 *   POST   /           TENANT_ADMIN, TENANT_MANAGER
 *   GET    /           TENANT_ADMIN, TENANT_MANAGER, COACH
 *   GET    /:id        TENANT_ADMIN, TENANT_MANAGER, COACH
 *   GET    /:id/profile TENANT_ADMIN, TENANT_MANAGER
 *   PATCH  /:id        TENANT_ADMIN, TENANT_MANAGER
 *   DELETE /:id        TENANT_ADMIN
 */
@Controller('customers')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  create(
    @Body() dto: CreateCustomerDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.customerService.create(dto, tenant.tenantId, actor.actorId);
  }

  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH')
  findAll(
    @Query() query: CustomerQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.customerService.findAll(tenant.tenantId, query);
  }

  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'COACH')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.customerService.findOne(id, tenant.tenantId);
  }

  @Get(':id/profile')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  getProfile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.customerService.getProfile(id, tenant.tenantId);
  }

  @Patch(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.customerService.update(id, dto, tenant.tenantId, actor.actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.customerService.remove(id, tenant.tenantId, actor.actorId);
  }
}
