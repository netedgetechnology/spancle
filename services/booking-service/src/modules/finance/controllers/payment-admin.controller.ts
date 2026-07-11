import {
  Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post,
  Query, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }           from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext }   from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                  from '../../booking/guards/booking.guard';
import { Roles }                                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                        from '../../../common/interceptors/audit.interceptor';
import { PaymentService }                          from '../services/payment.service';
import {
  InitiatePaymentDto,
  CapturePaymentDto,
  AllocatePaymentDto,
  FailPaymentDto,
} from '../dto/payment.dto';
import type { PaymentStatus } from '../entities/payment.entity';

@Controller('finance/admin/payments')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class PaymentAdminController {
  constructor(private readonly paymentService: PaymentService) {}

  /** POST /api/v1/finance/admin/payments — initiate */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  initiate(
    @Body() dto: InitiatePaymentDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.paymentService.initiate(dto, tenant.tenantId, actor.actorId);
  }

  /** GET /api/v1/finance/admin/payments */
  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('status')     status?:     PaymentStatus,
    @Query('customerId') customerId?: string,
    @Query('limit',  new DefaultValuePipe(50), ParseIntPipe) limit  = 50,
    @Query('offset', new DefaultValuePipe(0),  ParseIntPipe) offset = 0,
  ): Promise<unknown[]> {
    return this.paymentService.findAll(tenant.tenantId, { status, customerId, limit, offset });
  }

  /** GET /api/v1/finance/admin/payments/:id */
  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.paymentService.findById(id, tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/payments/:id/allocations */
  @Get(':id/allocations')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAllocations(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.paymentService.findAllocations(id, tenant.tenantId);
  }

  /** PATCH /api/v1/finance/admin/payments/:id/capture */
  @Patch(':id/capture')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  capture(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CapturePaymentDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.paymentService.capture(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/payments/:id/fail */
  @Patch(':id/fail')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  fail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FailPaymentDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.paymentService.fail(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/payments/:id/allocate */
  @Patch(':id/allocate')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  allocate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AllocatePaymentDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.paymentService.allocate(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/payments/:id/reconcile */
  @Patch(':id/reconcile')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  reconcile(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.paymentService.reconcile(id, tenant.tenantId, actor.actorId);
  }
}
