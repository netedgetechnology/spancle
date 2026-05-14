import { EventEmitter2 } from '@nestjs/event-emitter';
import { SportRepository } from '../repositories/sport.repository';
import { SportBranchRepository } from '../repositories/sport-branch.repository';
import { BranchService } from '../../branch/services/branch.service';
import type { CreateSportDto, UpdateSportDto, AssignBranchesDto, SportStatusDto } from '../dto/create-sport.dto';
import type { SportEntity } from '../entities/sport.entity';
/**
 * SportResponse — sport entity augmented with its branch IDs.
 * Returned by all read operations so the frontend always has branch context.
 */
export interface SportResponse extends SportEntity {
    branchIds: string[];
}
export declare class SportService {
    private readonly sportRepository;
    private readonly sportBranchRepository;
    private readonly branchService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(sportRepository: SportRepository, sportBranchRepository: SportBranchRepository, branchService: BranchService, eventEmitter: EventEmitter2);
    create(dto: CreateSportDto, tenantId: string, actorId: string): Promise<SportResponse>;
    findAll(tenantId: string, status?: string): Promise<SportResponse[]>;
    findOne(id: string, tenantId: string): Promise<SportResponse>;
    findBySlug(slug: string, tenantId: string): Promise<SportResponse>;
    findByBranch(branchId: string, tenantId: string): Promise<SportResponse[]>;
    getStatusSummary(tenantId: string): Promise<Record<SportEntity['status'], number>>;
    update(id: string, dto: UpdateSportDto, tenantId: string, actorId: string): Promise<SportResponse>;
    updateStatus(id: string, dto: SportStatusDto, tenantId: string, actorId: string): Promise<SportResponse>;
    /**
     * Replaces the full set of branch mappings for a sport.
     *
     * Uses replace strategy (soft-delete all + insert new) to ensure
     * atomicity. All provided branchIds must belong to the same tenant
     * and must not be archived.
     *
     * Passing an empty array removes all branch mappings.
     */
    assignBranches(sportId: string, dto: AssignBranchesDto, tenantId: string, actorId: string): Promise<SportResponse>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
    /**
     * Validates that all branchIds exist within the tenant and are not archived.
     * Throws 422 if any validation fails — prevents cross-tenant assignment.
     */
    private assertBranchesBelongToTenant;
    /**
     * Augments a SportEntity with its current branch ID list.
     */
    private withBranches;
    private emit;
}
//# sourceMappingURL=sport.service.d.ts.map