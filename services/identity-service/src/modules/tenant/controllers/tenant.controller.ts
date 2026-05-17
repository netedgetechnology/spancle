import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor }       from '../../../common/interceptors/audit.interceptor';
import { TenantContextInterceptor } from '../../../common/interceptors/tenant-context.interceptor';
import { JwtAuthGuard }           from '../../../common/guards/jwt-auth.guard';
import { RolesGuard }             from '../../../common/guards/roles.guard';
import { TenantStatusGuard }      from '../guards/tenant-status.guard';
import { PlanLimitGuard }         from '../guards/plan-limit.guard';
import { Roles, Public }                  from '../../../common/decorators/roles.decorator';
import { CurrentUser }            from '../../../common/decorators/current-user.decorator';
import type { JwtPayload }        from '@spancle/types';
import { TenantService }          from '../services/tenant.service';
import {
  CreateTenantDto,
  UpdateTenantDto,
  UpdateTenantSettingsDto,
  TenantStatusTransitionDto,
  ChangeTierDto,
} from '../dto/create-tenant.dto';
import type { TenantEntity } from '../entities/tenant.entity';

/**
 * TenantController — tenant lifecycle management.
 *
 * Route groups:
 *   POST   /tenants          → SUPER_ADMIN only
 *   GET    /tenants          → SUPER_ADMIN only
 *   GET    /tenants/:id      → SUPER_ADMIN or self (own tenantId)
 *   PATCH  /tenants/:id      → SUPER_ADMIN or TENANT_ADMIN (own)
 *   PATCH  /tenants/:id/settings → TENANT_ADMIN (own)
 *   POST   /tenants/:id/activate   → SUPER_ADMIN only
 *   POST   /tenants/:id/suspend    → SUPER_ADMIN only
 *   POST   /tenants/:id/terminate  → SUPER_ADMIN only
 *   PATCH  /tenants/:id/tier → SUPER_ADMIN only
 *
 * Guards applied at class level:
 *   JwtAuthGuard → TenantStatusGuard → PlanLimitGuard
 * Additional guards (RolesGuard) applied per endpoint.
 */
@Controller('tenants')
@UseGuards(JwtAuthGuard, TenantStatusGuard, PlanLimitGuard)
@UseInterceptors(AuditInterceptor, TenantContextInterceptor)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // ── Superadmin operations ─────────────────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createTenant(@Body() dto: CreateTenantDto): Promise<TenantEntity> {
    return this.tenantService.create(dto as any);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  async listTenants(
    @Query('page')   page?:   string,
    @Query('limit')  limit?:  string,
    @Query('status') status?: string,
    @Query('tier')   tier?:   string,
  ): Promise<{ data: TenantEntity[]; total: number }> {
    return this.tenantService.findAll(
      page   ? Number(page)  : 1,
      limit  ? Number(limit) : 20,
      status as never,
      tier   as never,
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  async getTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantEntity> {
    // TENANT_ADMIN can only view their own tenant
    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== id) {
      // RolesGuard doesn't enforce scope — we do it here
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    }
    return this.tenantService.getById(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  async updateTenant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantEntity> {
    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== id) {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    }
    return this.tenantService.update(id, dto);
  }

  @Patch(':id/settings')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'TENANT_ADMIN')
  async updateSettings(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantSettingsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantEntity> {
    if (user.role !== 'SUPER_ADMIN' && user.tenantId !== id) {
      throw Object.assign(new Error('Forbidden'), { status: 403 });
    }
    return this.tenantService.updateSettings(id, dto.settings as never);
  }

  @Post(':id/activate')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantEntity> {
    return this.tenantService.activate(id, user.userId);
  }

  @Post(':id/suspend')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TenantStatusTransitionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantEntity> {
    return this.tenantService.suspend(id, user.userId, dto.reason);
  }

  @Post(':id/terminate')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  async terminate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TenantStatusTransitionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantEntity> {
    return this.tenantService.terminate(id, user.userId, dto.reason);
  }

  @Patch(':id/tier')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  async changeTier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeTierDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TenantEntity> {
    return this.tenantService.changeTier(id, dto.tier as never, user.userId);
  }
}
