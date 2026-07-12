import {
  Body, Controller, DefaultValuePipe, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }           from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext }   from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                  from '../../booking/guards/booking.guard';
import { Roles }                                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                        from '../../../common/interceptors/audit.interceptor';
import { DisputeService }                          from '../services/dispute.service';
import { OpenDisputeDto, ResolveDisputeDto, CancelDisputeDto } from '../dto/dispute.dto';
import type { DisputeStatus }                      from '../entities/dispute.entity';

/**
 * DisputeAdminController — Finance Engine dispute administration endpoints.
 *
 * All routes require TenantGuard + RbacGuard.
 * TENANT_MANAGER may open and view disputes.
 * TENANT_ADMIN is required for resolutions and cancellations.
 */
@Controller('finance/admin/disputes')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class DisputeAdminController {
  constructor(private readonly disputeService: DisputeService) {}

  /** POST /api/v1/finance/admin/disputes — open a new dispute */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  open(
    @Body() dto: OpenDisputeDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.disputeService.openDispute(dto, tenant.tenantId, actor.actorId);
  }

  /** GET /api/v1/finance/admin/disputes */
  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('status')  status?: DisputeStatus,
    @Query('limit',  new DefaultValuePipe(50), ParseIntPipe) limit  = 50,
    @Query('offset', new DefaultValuePipe(0),  ParseIntPipe) offset = 0,
  ): Promise<unknown[]> {
    return this.disputeService.findAll(tenant.tenantId, { status, limit, offset });
  }

  /** GET /api/v1/finance/admin/disputes/:id */
  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.disputeService.findById(id, tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/disputes/payment/:paymentId */
  @Get('payment/:paymentId')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findByPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.disputeService.findByPayment(paymentId, tenant.tenantId);
  }

  /** PATCH /api/v1/finance/admin/disputes/:id/under-review */
  @Patch(':id/under-review')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  markUnderReview(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.disputeService.markUnderReview(id, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/disputes/:id/resolve-won */
  @Patch(':id/resolve-won')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  resolveWon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.disputeService.resolveWon(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/disputes/:id/resolve-lost */
  @Patch(':id/resolve-lost')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  resolveLost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveDisputeDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.disputeService.resolveLost(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/disputes/:id/cancel */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelDisputeDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.disputeService.cancelDispute(id, dto, tenant.tenantId, actor.actorId);
  }
}
