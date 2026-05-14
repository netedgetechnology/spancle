import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { SubscriptionEntity, type SubscriptionStatus } from '../entities/subscription.entity';

@Injectable()
export class SubscriptionRepository {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly repo: Repository<SubscriptionEntity>,
  ) {}

  async create(data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findById(id: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async findActiveByTenant(tenantId: string): Promise<SubscriptionEntity | null> {
    return this.repo.findOne({
      where: [
        { tenantId, status: 'active',    isDeleted: false },
        { tenantId, status: 'trialing',  isDeleted: false },
        { tenantId, status: 'past_due',  isDeleted: false },
        { tenantId, status: 'paused',    isDeleted: false },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findAllByTenant(tenantId: string): Promise<SubscriptionEntity[]> {
    return this.repo.find({
      where: { tenantId, isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  /** Returns all subscriptions with trials ending before `before` date */
  async findExpiredTrials(before: Date): Promise<SubscriptionEntity[]> {
    return this.repo.find({
      where: {
        status:   'trialing',
        trialEnd: LessThanOrEqual(before),
        isDeleted: false,
      },
    });
  }

  /** Returns all subscriptions with periodEnd before `before` and still active */
  async findExpiredPeriods(before: Date): Promise<SubscriptionEntity[]> {
    return this.repo.find({
      where: {
        status:    'past_due',
        periodEnd: LessThanOrEqual(before),
        isDeleted: false,
      },
    });
  }

  async updateStatus(id: string, status: SubscriptionStatus, extra: Partial<SubscriptionEntity> = {}): Promise<void> {
    await this.repo.update({ id }, { status, ...extra, updatedAt: new Date() });
  }

  async update(id: string, data: Partial<SubscriptionEntity>): Promise<SubscriptionEntity> {
    await this.repo.update({ id }, { ...data, updatedAt: new Date() });
    return this.repo.findOneOrFail({ where: { id } });
  }

  async countByStatus(tenantId: string, status: SubscriptionStatus): Promise<number> {
    return this.repo.count({ where: { tenantId, status, isDeleted: false } });
  }
}
