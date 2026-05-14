import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { PlanService } from '../services/plan.service';
import type { UpdatePlanDto } from '../dto/update-plan.dto';
export declare class PlanController {
    private readonly planService;
    constructor(planService: PlanService);
    /** GET current plan + effective limits for the authenticated tenant */
    getCurrentPlan(tenant: TenantContext): Promise<import("../entities/plan.entity").PlanEntity | null>;
    /** GET resolved effective features + limits (merged with overrides) */
    getEffectiveLimits(tenant: TenantContext): Promise<{
        features: Record<string, boolean>;
        limits: Record<string, number>;
        tierKey: string;
    }>;
    findOne(id: string): Promise<import("../entities/plan.entity").PlanEntity>;
    /** PATCH overrides — superadmin only, e.g. custom enterprise limits */
    updateOverrides(id: string, dto: UpdatePlanDto): Promise<import("../entities/plan.entity").PlanEntity>;
}
//# sourceMappingURL=plan.controller.d.ts.map