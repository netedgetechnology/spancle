import { EventEmitter2 } from '@nestjs/event-emitter';
import { BranchRepository } from '../repositories/branch.repository';
import { UserRepository } from '../../user/repositories/user.repository';
import type { CreateBranchDto, UpdateBranchDto, AssignManagerDto, BranchStatusDto } from '../dto/create-branch.dto';
import type { BranchEntity } from '../entities/branch.entity';
export declare class BranchService {
    private readonly branchRepository;
    private readonly userRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(branchRepository: BranchRepository, userRepository: UserRepository, eventEmitter: EventEmitter2);
    create(dto: CreateBranchDto, tenantId: string, actorId: string): Promise<BranchEntity>;
    findAll(tenantId: string, status?: string): Promise<BranchEntity[]>;
    findOne(id: string, tenantId: string): Promise<BranchEntity>;
    findBySlug(slug: string, tenantId: string): Promise<BranchEntity>;
    getStatusSummary(tenantId: string): Promise<Record<BranchEntity['status'], number>>;
    update(id: string, dto: UpdateBranchDto, tenantId: string, actorId: string): Promise<BranchEntity>;
    /**
     * Assigns or removes the branch manager.
     * Setting managerUserId to null removes the current manager.
     */
    assignManager(id: string, dto: AssignManagerDto, tenantId: string, actorId: string): Promise<BranchEntity>;
    updateStatus(id: string, dto: BranchStatusDto, tenantId: string, actorId: string): Promise<BranchEntity>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
    /**
     * Validates that the proposed manager exists and belongs to the tenant.
     * Throws 422 if not found — prevents cross-tenant assignment.
     */
    private assertManagerBelongsToTenant;
    /**
     * Validates that each day's openTime < closeTime (when not closed).
     * Times are HH:MM strings; lexicographic comparison is valid for 24h format.
     */
    private validateTimings;
    private emit;
}
//# sourceMappingURL=branch.service.d.ts.map