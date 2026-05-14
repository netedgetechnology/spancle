import { Repository } from 'typeorm';
import { SubscriptionEntity, type SubscriptionStatus } from '../entities/subscription.entity';
export declare class SubscriptionRepository {
    private readonly repo;
    constructor(repo: Repository<SubscriptionEntity>);
    create(data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity>;
    findById(id: string): Promise<SubscriptionEntity | null>;
    findActiveByTenant(tenantId: string): Promise<SubscriptionEntity | null>;
    findAllByTenant(tenantId: string): Promise<SubscriptionEntity[]>;
    /** Returns all subscriptions with trials ending before `before` date */
    findExpiredTrials(before: Date): Promise<SubscriptionEntity[]>;
    /** Returns all subscriptions with periodEnd before `before` and still active */
    findExpiredPeriods(before: Date): Promise<SubscriptionEntity[]>;
    updateStatus(id: string, status: SubscriptionStatus, extra?: Partial<SubscriptionEntity>): Promise<void>;
    update(id: string, data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity>;
    countByStatus(tenantId: string, status: SubscriptionStatus): Promise<number>;
}
//# sourceMappingURL=subscription.repository.d.ts.map