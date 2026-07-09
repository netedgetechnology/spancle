import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext } from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }  from '../../booking/guards/booking.guard';
import { Roles }                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }        from '../../../common/interceptors/audit.interceptor';
import { MembershipPlanService }   from '../services/membership-plan.service';
import { CreateMembershipPlanDto, CreateBenefitDto } from '../dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from '../dto/update-membership-plan.dto';

@Controller('membership-plans')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class MembershipPlanController {
  constructor(private readonly planService: MembershipPlanService) {}

  /** POST /api/v1/membership-plans */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN')
  create(
    @Body() dto: CreateMembershipPlanDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.planService.create(dto, tenant.tenantId, actor.actorId);
  }

  /** GET /api/v1/membership-plans */
  @Get()
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findAll(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.planService.findAll(tenant.tenantId);
  }

  /** GET /api/v1/membership-plans/public — for member portal (no RBAC) */
  @Get('public')
  @Roles('PLAYER', 'TENANT_ADMIN', 'TENANT_MANAGER')
  findPublic(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.planService.findAll(tenant.tenantId, /* activeOnly */ true);
  }

  /** GET /api/v1/membership-plans/:id */
  @Get(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.planService.findOne(id, tenant.tenantId);
  }

  /** PATCH /api/v1/membership-plans/:id */
  @Patch(':id')
  @Roles('TENANT_ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipPlanDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.planService.update(id, dto, tenant.tenantId, actor.actorId);
  }

  /** GET /api/v1/membership-plans/:id/benefits */
  @Get(':id/benefits')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  findBenefits(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown[]> {
    return this.planService.findBenefits(id, tenant.tenantId);
  }

  /** POST /api/v1/membership-plans/:id/benefits */
  @Post(':id/benefits')
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN')
  addBenefit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateBenefitDto,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.planService.addBenefit(id, dto, tenant.tenantId);
  }

  /** DELETE /api/v1/membership-plans/:id/benefits/:benefitId */
  @Delete(':id/benefits/:benefitId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  removeBenefit(
    @Param('benefitId', ParseUUIDPipe) benefitId: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<void> {
    return this.planService.removeBenefit(benefitId, tenant.tenantId);
  }

  /** PATCH /api/v1/membership-plans/:id/archive */
  @Patch(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<void> {
    return this.planService.archive(id, tenant.tenantId, actor.actorId);
  }
}
