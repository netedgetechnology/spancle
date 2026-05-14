import { type TenantContext } from '../../../common/decorators/tenant.decorator';
import { BranchService } from '../services/branch.service';
import { CreateBranchDto, UpdateBranchDto, AssignManagerDto, BranchStatusDto } from '../dto/create-branch.dto';
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
export declare class BranchController {
    private readonly branchService;
    constructor(branchService: BranchService);
    create(dto: CreateBranchDto, tenant: TenantContext, actorId: string): Promise<import("../entities/branch.entity").BranchEntity>;
    update(id: string, dto: UpdateBranchDto, tenant: TenantContext, actorId: string): Promise<import("../entities/branch.entity").BranchEntity>;
    /**
     * PATCH /branches/:id/status
     * Dedicated status transition endpoint — explicit and auditable.
     * Prevented from reactivating archived branches.
     */
    updateStatus(id: string, dto: BranchStatusDto, tenant: TenantContext, actorId: string): Promise<import("../entities/branch.entity").BranchEntity>;
    /**
     * PATCH /branches/:id/manager
     * Assigns or removes the branch manager.
     * Pass { managerUserId: null } to unassign.
     */
    assignManager(id: string, dto: AssignManagerDto, tenant: TenantContext, actorId: string): Promise<import("../entities/branch.entity").BranchEntity>;
    remove(id: string, tenant: TenantContext, actorId: string): Promise<void>;
    findAll(tenant: TenantContext, status?: string): Promise<import("../entities/branch.entity").BranchEntity[]>;
    /**
     * GET /branches/status-summary
     * Returns count of branches per status — used by the dashboard widget.
     * Must be declared before /:id to avoid route shadowing.
     */
    getStatusSummary(tenant: TenantContext): Promise<Record<import("../entities/branch.entity").BranchStatus, number>>;
    findBySlug(slug: string, tenant: TenantContext): Promise<import("../entities/branch.entity").BranchEntity>;
    findOne(id: string, tenant: TenantContext): Promise<import("../entities/branch.entity").BranchEntity>;
}
//# sourceMappingURL=branch.controller.d.ts.map