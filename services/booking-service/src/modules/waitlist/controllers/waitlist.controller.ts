import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, Query,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }         from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { Roles }                                  from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                       from '../../../common/interceptors/audit.interceptor';
import { TenantGuard, RbacGuard }                 from '../../booking/guards/booking.guard';
import { WaitlistService }                        from '../services/waitlist.service';
import { JoinWaitlistDto, WaitlistQueryDto }       from '../dto/waitlist.dto';

/**
 * WaitlistController
 *
 * Route prefix: /api/v1/waitlist
 *
 * RBAC matrix:
 *   POST   /                  TENANT_ADMIN, TENANT_MANAGER, PLAYER
 *   GET    /                  TENANT_ADMIN, TENANT_MANAGER
 *   GET    /slot/:slotId      TENANT_ADMIN, TENANT_MANAGER
 *   GET    /customer/:id      TENANT_ADMIN, TENANT_MANAGER, PLAYER (own entries)
 *   DELETE /:id               TENANT_ADMIN, TENANT_MANAGER, PLAYER
 */
@Controller('waitlist')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  join(
    @Body() dto: JoinWaitlistDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ) {
    return this.waitlistService.join(dto, tenant.tenantId, actor.actorId);
  }

  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(
    @Query() query: WaitlistQueryDto,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.waitlistService.findAll(tenant.tenantId, query);
  }

  @Get('slot/:slotId')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findBySlot(
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.waitlistService.findBySlot(slotId, tenant.tenantId);
  }

  @Get('customer/:customerId')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  findByCustomer(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.waitlistService.findByCustomer(customerId, tenant.tenantId);
  }

  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.waitlistService.findOne(id, tenant.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  leave(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.waitlistService.leave(id, tenant.tenantId);
  }
}
