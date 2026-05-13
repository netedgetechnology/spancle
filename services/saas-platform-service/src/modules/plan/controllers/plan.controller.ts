import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, ParseUUIDPipe, Patch, Post, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor }   from '../../../common/interceptors/audit.interceptor';
import { TenantCtx }          from '../../../common/decorators/tenant.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { SuperAdminGuard }    from '../../admin/guards/super-admin.guard';
import { PlanService }        from '../services/plan.service';
import type { UpdatePlanDto }  from '../dto/update-plan.dto';

@Controller('plans')
@UseInterceptors(AuditInterceptor)
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  /** GET current plan + effective limits for the authenticated tenant */
  @Get('current')
  getCurrentPlan(@TenantCtx() tenant: TenantContext) {
    return this.planService.findForTenant(tenant.tenantId);
  }

  /** GET resolved effective features + limits (merged with overrides) */
  @Get('current/effective-limits')
  getEffectiveLimits(@TenantCtx() tenant: TenantContext) {
    return this.planService.getEffectiveLimits(tenant.tenantId);
  }

  @Get(':id')
  @UseGuards(SuperAdminGuard)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.planService.findOne(id);
  }

  /** PATCH overrides — superadmin only, e.g. custom enterprise limits */
  @Patch(':id/overrides')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SuperAdminGuard)
  updateOverrides(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.planService.updateOverrides(id, dto, 'system');
  }
}
