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
import { CurrentUser }      from '../../../common/decorators/current-user.decorator';
import { Roles }            from '../../../common/decorators/roles.decorator';
import { AuditInterceptor } from '../../../common/interceptors/audit.interceptor';
import { SportService }     from '../services/sport.service';
import {
  CreateSportDto,
  UpdateSportDto,
  AssignBranchesDto,
  SportStatusDto,
} from '../dto/create-sport.dto';

/**
 * SportController — sport management endpoints.
 *
 * All routes are behind the global guard chain:
 *   TenantGuard → JwtAuthGuard → TenantStatusGuard
 *
 * Write operations require TENANT_ADMIN or TENANT_MANAGER role.
 * Read operations are open to all authenticated tenant users.
 *
 * Routes:
 *   POST   /api/v1/sports
 *   GET    /api/v1/sports                       ?status=active|inactive
 *   GET    /api/v1/sports/status-summary
 *   GET    /api/v1/sports/by-slug/:slug
 *   GET    /api/v1/sports/by-branch/:branchId
 *   GET    /api/v1/sports/:id
 *   PATCH  /api/v1/sports/:id
 *   PATCH  /api/v1/sports/:id/status
 *   PATCH  /api/v1/sports/:id/branches
 *   DELETE /api/v1/sports/:id
 */
@Controller('sports')
@UseInterceptors(AuditInterceptor)
export class SportController {
  constructor(private readonly sportService: SportService) {}

  // ── Write ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  create(
    @Body() dto: CreateSportDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.sportService.create(dto, tenant.tenantId, actorId);
  }

  @Patch(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSportDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.sportService.update(id, dto, tenant.tenantId, actorId);
  }

  /**
   * PATCH /sports/:id/status
   * Dedicated status transition — explicit and auditable.
   */
  @Patch(':id/status')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SportStatusDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.sportService.updateStatus(id, dto, tenant.tenantId, actorId);
  }

  /**
   * PATCH /sports/:id/branches
   * Replaces the full set of branch mappings for this sport.
   * Pass { branchIds: [] } to remove all mappings.
   */
  @Patch(':id/branches')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  assignBranches(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignBranchesDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.sportService.assignBranches(id, dto, tenant.tenantId, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.sportService.remove(id, tenant.tenantId, actorId);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('status') status?: string,
  ) {
    return this.sportService.findAll(tenant.tenantId, status);
  }

  /**
   * GET /sports/status-summary
   * Returns { active: N, inactive: N } — declared before /:id to avoid shadowing.
   */
  @Get('status-summary')
  getStatusSummary(@TenantCtx() tenant: TenantContext) {
    return this.sportService.getStatusSummary(tenant.tenantId);
  }

  @Get('by-slug/:slug')
  findBySlug(
    @Param('slug') slug: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.sportService.findBySlug(slug, tenant.tenantId);
  }

  /**
   * GET /sports/by-branch/:branchId
   * Returns all active sports mapped to a specific branch.
   */
  @Get('by-branch/:branchId')
  findByBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.sportService.findByBranch(branchId, tenant.tenantId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.sportService.findOne(id, tenant.tenantId);
  }
}
