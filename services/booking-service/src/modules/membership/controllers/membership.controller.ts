import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseIntPipe, ParseUUIDPipe, Patch, Post,
  Query, UseGuards, UseInterceptors, DefaultValuePipe,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }           from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext }   from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                  from '../../booking/guards/booking.guard';
import { Roles }                                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                        from '../../../common/interceptors/audit.interceptor';
import { MembershipService }                       from '../services/membership.service';
import { CreateMembershipDto }                     from '../dto/create-membership.dto';
import {
  FreezeMembershipDto,
  CancelMembershipDto,
  ScheduleDowngradeDto,
  UpdateMembershipDto,
  AssignUserDto,
} from '../dto/update-membership.dto';
import type { MembershipStatus } from '../entities/membership.entity';

@Controller('memberships')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  /** POST /api/v1/memberships — enrol */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  enrol(
    @Body() dto: CreateMembershipDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.enrol(dto, tenant.tenantId, actor.actorId);
  }

  /** GET /api/v1/memberships */
  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('userId')  userId?:  string,
    @Query('planId')  planId?:  string,
    @Query('status')  status?:  MembershipStatus,
    @Query('limit',  new DefaultValuePipe(50), ParseIntPipe) limit  = 50,
    @Query('offset', new DefaultValuePipe(0),  ParseIntPipe) offset = 0,
  ): Promise<unknown[]> {
    return this.membershipService.findAll(tenant.tenantId, {
      userId, planId, status, limit, offset,
    });
  }

  /** GET /api/v1/memberships/me — player self-service */
  @Get('me')
  @Roles('PLAYER', 'TENANT_ADMIN', 'TENANT_MANAGER')
  me(
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.findActiveByUser(actor.actorId, tenant.tenantId);
  }

  /** GET /api/v1/memberships/:id */
  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.membershipService.findOne(id, tenant.tenantId);
  }

  /** GET /api/v1/memberships/:id/transactions */
  @Get(':id/transactions')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  transactions(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @Query('limit',  new DefaultValuePipe(50), ParseIntPipe) limit  = 50,
    @Query('offset', new DefaultValuePipe(0),  ParseIntPipe) offset = 0,
  ): Promise<unknown[]> {
    return this.membershipService.findTransactions(id, tenant.tenantId, limit, offset);
  }

  /** PATCH /api/v1/memberships/:id */
  @Patch(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.update(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/activate */
  @Patch(':id/activate')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.activate(id, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/freeze */
  @Patch(':id/freeze')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  freeze(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FreezeMembershipDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.freeze(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/unfreeze */
  @Patch(':id/unfreeze')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  unfreeze(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.unfreeze(id, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/cancel */
  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'PLAYER')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelMembershipDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.cancel(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/suspend */
  @Patch(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.suspend(id, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/restore */
  @Patch(':id/restore')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.restore(id, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/schedule-downgrade */
  @Patch(':id/schedule-downgrade')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  scheduleDowngrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleDowngradeDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.scheduleDowngrade(id, dto, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/memberships/:id/assign-user */
  @Patch(':id/assign-user')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  assignUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignUserDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.membershipService.assignUser(id, dto, tenant.tenantId, actor.actorId);
  }
}
