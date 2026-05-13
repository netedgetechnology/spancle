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
  UseInterceptors,
} from '@nestjs/common';
import { TenantCtx, type TenantContext } from '../../../common/decorators/tenant.decorator';
import { CurrentUser }     from '../../../common/decorators/current-user.decorator';
import { Roles }           from '../../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { BranchService }   from '../services/branch.service';
import {
  CreateBranchDto,
  UpdateBranchDto,
  AssignManagerDto,
  BranchStatusDto,
} from '../dto/create-branch.dto';
import type { JwtPayload } from '@spancle/types';

/**
 * BranchController — branch management endpoints.
 *
 * All routes are behind global guards:
 *   TenantGuard, JwtAuthGuard, TenantStatusGuard
 *
 * Write operations (create, update, delete, status, manager):
 *   @Roles('TENANT_ADMIN', 'TENANT_MANAGER') — only admin and manager
 *
 * Read operations (list, single, slug):
 *   No additional role requirement — all authenticated tenant users
 *
 * Routes:
 *   POST   /api/v1/branches
 *   GET    /api/v1/branches
 *   GET    /api/v1/branches/status-summary
 *   GET    /api/v1/branches/by-slug/:slug
 *   GET    /api/v1/branches/:id
 *   PATCH  /api/v1/branches/:id
 *   PATCH  /api/v1/branches/:id/status
 *   PATCH  /api/v1/branches/:id/manager
 *   DELETE /api/v1/branches/:id
 */
@Controller('branches')
@UseInterceptors(AuditInterceptor)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // ── Write ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  create(
    @Body() dto: CreateBranchDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.branchService.create(dto, tenant.tenantId, actorId);
  }

  @Patch(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBranchDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.branchService.update(id, dto, tenant.tenantId, actorId);
  }

  /**
   * PATCH /branches/:id/status
   * Dedicated status transition endpoint — explicit and auditable.
   * Prevented from reactivating archived branches.
   */
  @Patch(':id/status')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: BranchStatusDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.branchService.updateStatus(id, dto, tenant.tenantId, actorId);
  }

  /**
   * PATCH /branches/:id/manager
   * Assigns or removes the branch manager.
   * Pass { managerUserId: null } to unassign.
   */
  @Patch(':id/manager')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  assignManager(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignManagerDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.branchService.assignManager(id, dto, tenant.tenantId, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.branchService.remove(id, tenant.tenantId, actorId);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('status') status?: string,
  ) {
    return this.branchService.findAll(tenant.tenantId, status);
  }

  /**
   * GET /branches/status-summary
   * Returns count of branches per status — used by the dashboard widget.
   * Must be declared before /:id to avoid route shadowing.
   */
  @Get('status-summary')
  getStatusSummary(@TenantCtx() tenant: TenantContext) {
    return this.branchService.getStatusSummary(tenant.tenantId);
  }

  @Get('by-slug/:slug')
  findBySlug(
    @Param('slug') slug: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.branchService.findBySlug(slug, tenant.tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.branchService.findOne(id, tenant.tenantId);
  }
}
