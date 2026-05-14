import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { SportService } from '../services/sport.service';
import { CreateSportDto, UpdateSportDto, AssignBranchesDto, SportStatusDto } from '../dto/create-sport.dto';
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
export declare class SportController {
    private readonly sportService;
    constructor(sportService: SportService);
    create(dto: CreateSportDto, tenant: TenantContext, actorId: string): Promise<import("../services/sport.service").SportResponse>;
    update(id: string, dto: UpdateSportDto, tenant: TenantContext, actorId: string): Promise<import("../services/sport.service").SportResponse>;
    /**
     * PATCH /sports/:id/status
     * Dedicated status transition — explicit and auditable.
     */
    updateStatus(id: string, dto: SportStatusDto, tenant: TenantContext, actorId: string): Promise<import("../services/sport.service").SportResponse>;
    /**
     * PATCH /sports/:id/branches
     * Replaces the full set of branch mappings for this sport.
     * Pass { branchIds: [] } to remove all mappings.
     */
    assignBranches(id: string, dto: AssignBranchesDto, tenant: TenantContext, actorId: string): Promise<import("../services/sport.service").SportResponse>;
    remove(id: string, tenant: TenantContext, actorId: string): Promise<void>;
    findAll(tenant: TenantContext, status?: string): Promise<import("../services/sport.service").SportResponse[]>;
    /**
     * GET /sports/status-summary
     * Returns { active: N, inactive: N } — declared before /:id to avoid shadowing.
     */
    getStatusSummary(tenant: TenantContext): Promise<Record<import("../entities/sport.entity").SportStatus, number>>;
    findBySlug(slug: string, tenant: TenantContext): Promise<import("../services/sport.service").SportResponse>;
    /**
     * GET /sports/by-branch/:branchId
     * Returns all active sports mapped to a specific branch.
     */
    findByBranch(branchId: string, tenant: TenantContext): Promise<import("../services/sport.service").SportResponse[]>;
    findOne(id: string, tenant: TenantContext): Promise<import("../services/sport.service").SportResponse>;
}
//# sourceMappingURL=sport.controller.d.ts.map