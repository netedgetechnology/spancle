import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import { SubscriptionService } from '../services/subscription.service';
import { CreateSubscriptionDto, CancelSubscriptionDto, ActivateSubscriptionDto } from '../dto/create-subscription.dto';
/**
 * SubscriptionController
 *
 * Tenant routes (require valid tenant context):
 *   POST   /api/v1/subscriptions         → subscribe to a package
 *   GET    /api/v1/subscriptions/current → current subscription
 *   GET    /api/v1/subscriptions         → full history
 *   POST   /api/v1/subscriptions/:id/cancel
 *
 * Admin routes (SUPER_ADMIN only):
 *   POST   /api/v1/subscriptions/:id/activate
 *   POST   /api/v1/subscriptions/:id/pause
 *   POST   /api/v1/subscriptions/:id/resume
 *   POST   /api/v1/subscriptions/:id/expire
 */
export declare class SubscriptionController {
    private readonly subscriptionService;
    constructor(subscriptionService: SubscriptionService);
    create(dto: CreateSubscriptionDto, tenant: TenantContext): Promise<import("../entities/subscription.entity").SubscriptionEntity>;
    getCurrent(tenant: TenantContext): Promise<import("../entities/subscription.entity").SubscriptionEntity | null>;
    findAll(tenant: TenantContext): Promise<import("../entities/subscription.entity").SubscriptionEntity[]>;
    findOne(id: string): Promise<import("../entities/subscription.entity").SubscriptionEntity>;
    cancel(id: string, dto: CancelSubscriptionDto): Promise<import("../entities/subscription.entity").SubscriptionEntity>;
    activate(id: string, dto: ActivateSubscriptionDto): Promise<import("../entities/subscription.entity").SubscriptionEntity>;
    pause(id: string): Promise<import("../entities/subscription.entity").SubscriptionEntity>;
    resume(id: string): Promise<import("../entities/subscription.entity").SubscriptionEntity>;
    expire(id: string): Promise<import("../entities/subscription.entity").SubscriptionEntity>;
}
//# sourceMappingURL=subscription.controller.d.ts.map