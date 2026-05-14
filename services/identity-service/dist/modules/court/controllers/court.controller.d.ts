import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { CourtService } from '../services/court.service';
import { CreateCourtDto, UpdateCourtDto, CourtStatusDto, MaintenanceDto, GenerateCourtsDto } from '../dto/create-court.dto';
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
export declare class CourtController {
    private readonly courtService;
    constructor(courtService: CourtService);
    create(dto: CreateCourtDto, tenant: TenantContext, actorId: string): Promise<import("../entities/court.entity").CourtEntity>;
    /**
     * POST /courts/generate
     * Bulk-generates numbered courts with a shared prefix.
     * Transactional — rolls back completely on any failure.
     * Returns { courts, created, skipped }.
     */
    generateCourts(dto: GenerateCourtsDto, tenant: TenantContext, actorId: string): Promise<{
        courts: import("../entities/court.entity").CourtEntity[];
        created: number;
        skipped: number;
    }>;
    update(id: string, dto: UpdateCourtDto, tenant: TenantContext, actorId: string): Promise<import("../entities/court.entity").CourtEntity>;
    /**
     * PATCH /courts/:id/status
     * Dedicated status transition endpoint — auditable and explicit.
     * Validates allowed transitions. Clears maintenance fields on exit.
     */
    updateStatus(id: string, dto: CourtStatusDto, tenant: TenantContext, actorId: string): Promise<import("../entities/court.entity").CourtEntity>;
    /**
     * PATCH /courts/:id/maintenance
     * Sets the court into maintenance with a required note.
     * Separate endpoint so maintenance reason is always captured.
     */
    setMaintenance(id: string, dto: MaintenanceDto, tenant: TenantContext, actorId: string): Promise<import("../entities/court.entity").CourtEntity>;
    remove(id: string, tenant: TenantContext, actorId: string): Promise<void>;
    findAll(tenant: TenantContext, branchId?: string, sportId?: string, status?: string): Promise<import("../entities/court.entity").CourtEntity[]>;
    /**
     * GET /courts/status-summary
     * Declared before /:id to avoid route shadowing.
     */
    getStatusSummary(tenant: TenantContext): Promise<Record<import("../entities/court.entity").CourtStatus, number>>;
    /**
     * GET /courts/by-branch/:branchId
     * Returns all courts in a branch. Optional ?status= filter.
     */
    findByBranch(branchId: string, tenant: TenantContext, status?: string): Promise<import("../entities/court.entity").CourtEntity[]>;
    /**
     * GET /courts/by-sport/:sportId
     * Returns all courts linked to a sport. Optional ?branchId= filter.
     */
    findBySport(sportId: string, tenant: TenantContext, branchId?: string): Promise<import("../entities/court.entity").CourtEntity[]>;
    findOne(id: string, tenant: TenantContext): Promise<import("../entities/court.entity").CourtEntity>;
}
//# sourceMappingURL=court.controller.d.ts.map