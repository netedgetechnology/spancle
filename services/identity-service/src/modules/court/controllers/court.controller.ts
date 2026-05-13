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
import { CourtService }     from '../services/court.service';
import {
  CreateCourtDto,
  UpdateCourtDto,
  CourtStatusDto,
  MaintenanceDto,
  GenerateCourtsDto,
} from '../dto/create-court.dto';

/**
 * CourtController — court / venue management endpoints.
 *
 * All routes protected by global guard chain:
 *   TenantGuard → JwtAuthGuard → TenantStatusGuard
 *
 * Write ops (create, update, generate, status, maintenance, delete):
 *   @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
 *
 * Delete:
 *   @Roles('TENANT_ADMIN') — elevated
 *
 * Read ops: all authenticated tenant users
 *
 * Routes:
 *   POST   /api/v1/courts                      create single
 *   POST   /api/v1/courts/generate             bulk generation
 *   GET    /api/v1/courts                      list (?branchId= &sportId= &status=)
 *   GET    /api/v1/courts/status-summary       { available:N, ... }
 *   GET    /api/v1/courts/by-branch/:branchId  all courts in a branch
 *   GET    /api/v1/courts/by-sport/:sportId    all courts for a sport
 *   GET    /api/v1/courts/:id                  single court
 *   PATCH  /api/v1/courts/:id                  update details
 *   PATCH  /api/v1/courts/:id/status           status transition
 *   PATCH  /api/v1/courts/:id/maintenance      set maintenance + reason
 *   DELETE /api/v1/courts/:id                  soft delete
 */
@Controller('courts')
@UseInterceptors(AuditInterceptor)
export class CourtController {
  constructor(private readonly courtService: CourtService) {}

  // ── Write ──────────────────────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  create(
    @Body() dto: CreateCourtDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.courtService.create(dto, tenant.tenantId, actorId);
  }

  /**
   * POST /courts/generate
   * Bulk-generates numbered courts with a shared prefix.
   * Transactional — rolls back completely on any failure.
   * Returns { courts, created, skipped }.
   */
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  generateCourts(
    @Body() dto: GenerateCourtsDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.courtService.generateCourts(dto, tenant.tenantId, actorId);
  }

  @Patch(':id')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourtDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.courtService.update(id, dto, tenant.tenantId, actorId);
  }

  /**
   * PATCH /courts/:id/status
   * Dedicated status transition endpoint — auditable and explicit.
   * Validates allowed transitions. Clears maintenance fields on exit.
   */
  @Patch(':id/status')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CourtStatusDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.courtService.updateStatus(id, dto, tenant.tenantId, actorId);
  }

  /**
   * PATCH /courts/:id/maintenance
   * Sets the court into maintenance with a required note.
   * Separate endpoint so maintenance reason is always captured.
   */
  @Patch(':id/maintenance')
  @Roles('TENANT_ADMIN', 'TENANT_MANAGER')
  setMaintenance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MaintenanceDto,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.courtService.setMaintenance(id, dto, tenant.tenantId, actorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('TENANT_ADMIN')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
    @CurrentUser('userId') actorId: string,
  ) {
    return this.courtService.remove(id, tenant.tenantId, actorId);
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  @Get()
  findAll(
    @TenantCtx() tenant: TenantContext,
    @Query('branchId') branchId?: string,
    @Query('sportId')  sportId?:  string,
    @Query('status')   status?:   string,
  ) {
    if (sportId) {
      return this.courtService.findBySport(sportId, tenant.tenantId, branchId);
    }
    return this.courtService.findAll(tenant.tenantId, branchId, status);
  }

  /**
   * GET /courts/status-summary
   * Declared before /:id to avoid route shadowing.
   */
  @Get('status-summary')
  getStatusSummary(@TenantCtx() tenant: TenantContext) {
    return this.courtService.getStatusSummary(tenant.tenantId);
  }

  /**
   * GET /courts/by-branch/:branchId
   * Returns all courts in a branch. Optional ?status= filter.
   */
  @Get('by-branch/:branchId')
  findByBranch(
    @Param('branchId', ParseUUIDPipe) branchId: string,
    @TenantCtx() tenant: TenantContext,
    @Query('status') status?: string,
  ) {
    return this.courtService.findByBranch(branchId, tenant.tenantId, status);
  }

  /**
   * GET /courts/by-sport/:sportId
   * Returns all courts linked to a sport. Optional ?branchId= filter.
   */
  @Get('by-sport/:sportId')
  findBySport(
    @Param('sportId', ParseUUIDPipe) sportId: string,
    @TenantCtx() tenant: TenantContext,
    @Query('branchId') branchId?: string,
  ) {
    return this.courtService.findBySport(sportId, tenant.tenantId, branchId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantCtx() tenant: TenantContext,
  ) {
    return this.courtService.findOne(id, tenant.tenantId);
  }
}
