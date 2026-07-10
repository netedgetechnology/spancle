import {
  Body, Controller, Get, HttpCode, HttpStatus,
  Param, Patch, Post, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext }           from '../../../common/decorators/tenant.decorator';
import { BookingActor, type BookingActorContext }   from '../../../common/decorators/current-user.decorator';
import { TenantGuard, RbacGuard }                  from '../../booking/guards/booking.guard';
import { Roles }                                   from '../../../common/decorators/roles.decorator';
import { AuditInterceptor }                        from '../../../common/interceptors/audit.interceptor';
import { AccountingPeriodService }                 from '../services/accounting-period.service';
import { ChartOfAccountService }                   from '../services/chart-of-account.service';
import { IsNotEmpty, IsOptional, IsString }        from 'class-validator';

class PeriodParamDto {
  @IsString() @IsNotEmpty() period!: string;  // YYYY-MM
}

class ReopenPeriodDto {
  @IsString() @IsNotEmpty() note!: string;
}

class CloseParamDto {
  @IsString() @IsNotEmpty() period!: string;
}

/**
 * FinanceAdminController — internal admin endpoints for accounting period management.
 *
 * All routes require TENANT_ADMIN or SUPER_ADMIN.
 * Not exposed publicly — nginx must restrict to internal callers only.
 */
@Controller('finance/admin')
@UseGuards(TenantGuard, RbacGuard)
@UseInterceptors(AuditInterceptor)
export class FinanceAdminController {
  constructor(
    private readonly periodService:  AccountingPeriodService,
    private readonly coaService:     ChartOfAccountService,
  ) {}

  // ── Accounting Periods ────────────────────────────────────────────────────

  /** GET /api/v1/finance/admin/periods */
  @Get('periods')
  @Roles('TENANT_ADMIN')
  listPeriods(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.periodService.findAll(tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/periods/open */
  @Get('periods/open')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  openPeriod(@TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.periodService.findOpen(tenant.tenantId);
  }

  /** POST /api/v1/finance/admin/periods/ensure-current */
  @Post('periods/ensure-current')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  ensureCurrent(@TenantCtx() tenant: TenantContext): Promise<unknown> {
    return this.periodService.ensureCurrentPeriodOpen(tenant.tenantId);
  }

  /** PATCH /api/v1/finance/admin/periods/:period/begin-close */
  @Patch('periods/:period/begin-close')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  beginClose(
    @Param('period') period: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.periodService.beginClose(period, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/periods/:period/confirm-close */
  @Patch('periods/:period/confirm-close')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  confirmClose(
    @Param('period') period: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.periodService.confirmClose(period, tenant.tenantId);
  }

  /** PATCH /api/v1/finance/admin/periods/:period/lock */
  @Patch('periods/:period/lock')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  lock(
    @Param('period') period: string,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.periodService.lock(period, tenant.tenantId, actor.actorId);
  }

  /** PATCH /api/v1/finance/admin/periods/:period/reopen — SUPER_ADMIN only */
  @Patch('periods/:period/reopen')
  @HttpCode(HttpStatus.OK)
  @Roles('SUPER_ADMIN')
  reopen(
    @Param('period') period: string,
    @Body() dto: ReopenPeriodDto,
    @TenantCtx() tenant: TenantContext,
    @BookingActor() actor: BookingActorContext,
  ): Promise<unknown> {
    return this.periodService.reopen(period, tenant.tenantId, actor.actorId, dto.note);
  }

  // ── Chart of Accounts ─────────────────────────────────────────────────────

  /** GET /api/v1/finance/admin/accounts */
  @Get('accounts')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  listAccounts(@TenantCtx() tenant: TenantContext): Promise<unknown[]> {
    return this.coaService.findAll(tenant.tenantId);
  }

  /** GET /api/v1/finance/admin/accounts/:code */
  @Get('accounts/:code')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  getAccount(
    @Param('code') code: string,
    @TenantCtx() tenant: TenantContext,
  ): Promise<unknown> {
    return this.coaService.findByCode(code, tenant.tenantId);
  }

  /** POST /api/v1/finance/admin/accounts/seed */
  @Post('accounts/seed')
  @HttpCode(HttpStatus.OK)
  @Roles('TENANT_ADMIN')
  seedAccounts(@TenantCtx() tenant: TenantContext): Promise<void> {
    return this.coaService.seedSystemAccounts(tenant.tenantId);
  }
}
