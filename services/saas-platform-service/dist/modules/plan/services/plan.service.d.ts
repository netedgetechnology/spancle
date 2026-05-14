import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository } from '../repositories/plan.repository';
import { PackageService } from '../../package/services/package.service';
import type { CreatePlanDto } from '../dto/create-plan.dto';
import type { UpdatePlanDto } from '../dto/update-plan.dto';
import { PlanEntity } from '../entities/plan.entity';
export declare class PlanService {
    private readonly planRepository;
    private readonly packageService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(planRepository: PlanRepository, packageService: PackageService, eventEmitter: EventEmitter2);
    /**
     * Upserts the active plan for a tenant.
     * Called by SubscriptionService when a subscription is activated.
     * Deactivates any previous plan before creating the new one.
     */
    upsertForTenant(dto: CreatePlanDto, actorId: string): Promise<PlanEntity>;
    findForTenant(tenantId: string): Promise<PlanEntity | null>;
    findOne(id: string): Promise<PlanEntity>;
    /**
     * Updates feature/limit overrides for a tenant plan.
     * Used by superadmin to grant enterprise-custom limits.
     * Merges on top of existing overrides — never full-replaces.
     */
    updateOverrides(id: string, dto: UpdatePlanDto, actorId: string): Promise<PlanEntity>;
    /**
     * Returns the effective resolved limits for a tenant.
     * Merges package.limits with plan.limitOverrides (overrides win).
     */
    getEffectiveLimits(tenantId: string): Promise<{
        features: Record<string, boolean>;
        limits: Record<string, number>;
        tierKey: string;
    }>;
    remove(id: string, actorId: string): Promise<void>;
}
//# sourceMappingURL=plan.service.d.ts.map