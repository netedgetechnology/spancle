import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourtRepository } from '../repositories/court.repository';
import { BranchService } from '../../branch/services/branch.service';
import { SportService } from '../../sport/services/sport.service';
import type { CreateCourtDto, UpdateCourtDto, CourtStatusDto, MaintenanceDto, GenerateCourtsDto } from '../dto/create-court.dto';
import type { CourtEntity, CourtStatus } from '../entities/court.entity';
export declare class CourtService {
    private readonly courtRepository;
    private readonly branchService;
    private readonly sportService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(courtRepository: CourtRepository, branchService: BranchService, sportService: SportService, eventEmitter: EventEmitter2);
    create(dto: CreateCourtDto, tenantId: string, actorId: string): Promise<CourtEntity>;
    /**
     * Generates multiple courts atomically in a single transaction.
     *
     * Naming: `{namePrefix}{separator}{number}` for each court.
     * Skips names that already exist in the branch (idempotent).
     *
     * Returns:
     *   courts:  created court entities
     *   created: number of courts successfully created
     *   skipped: number of names that were already taken
     */
    generateCourts(dto: GenerateCourtsDto, tenantId: string, actorId: string): Promise<{
        courts: CourtEntity[];
        created: number;
        skipped: number;
    }>;
    findAll(tenantId: string, branchId?: string, status?: string): Promise<CourtEntity[]>;
    findOne(id: string, tenantId: string): Promise<CourtEntity>;
    findByBranch(branchId: string, tenantId: string, status?: string): Promise<CourtEntity[]>;
    findBySport(sportId: string, tenantId: string, branchId?: string): Promise<CourtEntity[]>;
    getStatusSummary(tenantId: string): Promise<Record<CourtStatus, number>>;
    update(id: string, dto: UpdateCourtDto, tenantId: string, actorId: string): Promise<CourtEntity>;
    updateStatus(id: string, dto: CourtStatusDto, tenantId: string, actorId: string): Promise<CourtEntity>;
    /**
     * Sets a court into maintenance with a required reason.
     * Dedicated endpoint for explicitness and audit clarity.
     */
    setMaintenance(id: string, dto: MaintenanceDto, tenantId: string, actorId: string): Promise<CourtEntity>;
    remove(id: string, tenantId: string, actorId: string): Promise<void>;
    private assertBranchBelongsToTenant;
    private assertSportBelongsToTenant;
    /**
     * Validates the operating hours object has all 7 days with valid time format.
     * Times must be HH:MM and openTime must be before closeTime for open days.
     */
    private validateOperatingHours;
    private emit;
}
//# sourceMappingURL=court.service.d.ts.map