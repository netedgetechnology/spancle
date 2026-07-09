import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Post, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }           from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext }   from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                  from '../../booking/guards/booking.guard';
import { Roles }                                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                        from '../../../common/interceptors/audit.interceptor';
import { EntitlementService }                      from '../services/entitlement.service';
import {
  ConsumeEntitlementDto,
  RefundEntitlementDto,
  AdjustEntitlementDto,
  ReserveEntitlementDto,
  ReleaseReservedEntitlementDto,
  InitialiseEntitlementDto,
} from '../dto/entitlement.dto';

@Controller('memberships/:membershipId/entitlements')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class EntitlementController {
  constructor(private readonly entitlementService: EntitlementService) {}

  /** GET /api/v1/memberships/:membershipId/entitlements */
  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER')
  findAll(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.entitlementService.findAll(membershipId, tenant.tenantId);
  }

  /** GET /api/v1/memberships/:membershipId/entitlements/:benefitType */
  @Get(':benefitType')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER')
  findOne(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Param('benefitType') benefitType: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.entitlementService.findOne(membershipId, benefitType, tenant.tenantId);
  }

  /** POST /api/v1/memberships/:membershipId/entitlements/initialise */
  @Post('initialise')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  initialise(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: InitialiseEntitlementDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.entitlementService.initialise(membershipId, tenant.tenantId, dto);
  }

  /** POST /api/v1/memberships/:membershipId/entitlements/consume */
  @Post('consume')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER')
  consume(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: ConsumeEntitlementDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.entitlementService.consume(membershipId, dto, tenant.tenantId, actor.actorId);
  }

  /** POST /api/v1/memberships/:membershipId/entitlements/refund */
  @Post('refund')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF')
  refund(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: RefundEntitlementDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.entitlementService.refund(membershipId, dto, tenant.tenantId, actor.actorId);
  }

  /** POST /api/v1/memberships/:membershipId/entitlements/adjust */
  @Post('adjust')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  adjust(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: AdjustEntitlementDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.entitlementService.adjust(membershipId, dto, tenant.tenantId, actor.actorId);
  }

  /** POST /api/v1/memberships/:membershipId/entitlements/reserve */
  @Post('reserve')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER')
  reserve(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: ReserveEntitlementDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.entitlementService.reserve(membershipId, dto, tenant.tenantId, actor.actorId);
  }

  /** POST /api/v1/memberships/:membershipId/entitlements/release */
  @Post('release')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER', 'TENANT_STAFF', 'PLAYER')
  release(
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @Body() dto: ReleaseReservedEntitlementDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.entitlementService.releaseReservation(
      membershipId, dto, tenant.tenantId, actor.actorId,
    );
  }
}
