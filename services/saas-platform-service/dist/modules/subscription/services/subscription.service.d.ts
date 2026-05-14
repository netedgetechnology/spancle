import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PackageService } from '../../package/services/package.service';
import type { CreateSubscriptionDto, CancelSubscriptionDto, ActivateSubscriptionDto } from '../dto/create-subscription.dto';
import { SubscriptionEntity } from '../entities/subscription.entity';
export declare class SubscriptionService {
    private readonly subscriptionRepository;
    private readonly packageService;
    private readonly eventEmitter;
    private readonly logger;
    constructor(subscriptionRepository: SubscriptionRepository, packageService: PackageService, eventEmitter: EventEmitter2);
    create(dto: CreateSubscriptionDto, tenantId: string, actorId: string): Promise<SubscriptionEntity>;
    findActiveForTenant(tenantId: string): Promise<SubscriptionEntity | null>;
    findAllForTenant(tenantId: string): Promise<SubscriptionEntity[]>;
    findOne(id: string): Promise<SubscriptionEntity>;
    activate(id: string, dto: ActivateSubscriptionDto, actorId: string): Promise<SubscriptionEntity>;
    cancel(id: string, dto: CancelSubscriptionDto, actorId: string): Promise<SubscriptionEntity>;
    expire(id: string, actorId?: string): Promise<SubscriptionEntity>;
    markPastDue(id: string, actorId?: string): Promise<SubscriptionEntity>;
    pause(id: string, actorId: string): Promise<SubscriptionEntity>;
    resume(id: string, actorId: string): Promise<SubscriptionEntity>;
    processExpiredTrials(): Promise<number>;
    private assertTransition;
    private emitEvent;
    private buildPayload;
    private computePeriodEnd;
}
//# sourceMappingURL=subscription.service.d.ts.map