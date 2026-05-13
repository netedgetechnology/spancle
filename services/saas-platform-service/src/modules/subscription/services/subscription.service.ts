import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { PackageService }         from '../../package/services/package.service';
import type {
  CreateSubscriptionDto,
  CancelSubscriptionDto,
  ActivateSubscriptionDto,
} from '../dto/create-subscription.dto';
import { SubscriptionEntity } from '../entities/subscription.entity';
import {
  SubscriptionEvents,
  type SubscriptionEventPayload,
} from '../events/subscription.events';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  trialing:  ['active', 'expired', 'cancelled'],
  active:    ['past_due', 'cancelled', 'paused'],
  past_due:  ['active', 'expired'],
  cancelled: [],
  expired:   [],
  paused:    ['active', 'cancelled'],
};

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
    private readonly packageService:         PackageService,
    private readonly eventEmitter:           EventEmitter2,
  ) {}

  async create(
    dto:      CreateSubscriptionDto,
    tenantId: string,
    actorId:  string,
  ): Promise<SubscriptionEntity> {
    const existing = await this.subscriptionRepository.findActiveByTenant(tenantId);
    if (existing) {
      throw new ConflictException(
        `Tenant already has an active subscription (${existing.id}). Cancel it first.`,
      );
    }

    const pkg = await this.packageService.findOne(dto.packageId);
    if (pkg.status !== 'active') {
      throw new BadRequestException(`Package "${pkg.name}" is not active`);
    }

    const now           = new Date();
    const billingCycle  = dto.billingCycle ?? 'monthly';
    const hasTrial      = pkg.trialDays > 0;
    const initialStatus = hasTrial ? 'trialing' : 'active';
    const trialEnd      = hasTrial
      ? new Date(now.getTime() + pkg.trialDays * 86_400_000)
      : null;
    const periodEnd     = this.computePeriodEnd(now, billingCycle);
    const price         = billingCycle === 'annual'
      ? pkg.priceAnnualMinorUnits
      : pkg.priceMonthlyMinorUnits;

    const entity = await this.subscriptionRepository.create({
      tenantId,
      packageId:        pkg.id,
      tierKey:          pkg.tierKey,
      status:           initialStatus,
      billingCycle,
      priceMinorUnits:  price,
      currency:         pkg.currency,
      periodStart:      now,
      periodEnd,
      trialEnd,
      featuresSnapshot: { ...pkg.features },
      limitsSnapshot:   { ...pkg.limits },
      isDeleted:        false,
    });

    const eventName = hasTrial ? SubscriptionEvents.TRIAL_STARTED : SubscriptionEvents.ACTIVATED;
    await this.emitEvent(eventName, entity, actorId);
    this.logger.log(`Subscription created: ${entity.id} tenant=${tenantId} tier=${pkg.tierKey}`);
    return entity;
  }

  async findActiveForTenant(tenantId: string): Promise<SubscriptionEntity | null> {
    return this.subscriptionRepository.findActiveByTenant(tenantId);
  }

  async findAllForTenant(tenantId: string): Promise<SubscriptionEntity[]> {
    return this.subscriptionRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string): Promise<SubscriptionEntity> {
    const entity = await this.subscriptionRepository.findById(id);
    if (!entity) throw new NotFoundException(`Subscription ${id} not found`);
    return entity;
  }

  async activate(id: string, dto: ActivateSubscriptionDto, actorId: string): Promise<SubscriptionEntity> {
    const sub = await this.findOne(id);
    this.assertTransition(sub.status, 'active');
    await this.subscriptionRepository.updateStatus(id, 'active', {
      externalSubId: dto.externalSubId ?? sub.externalSubId ?? undefined,
    });
    const updated = await this.findOne(id);
    await this.emitEvent(SubscriptionEvents.ACTIVATED, updated, actorId);
    return updated;
  }

  async cancel(id: string, dto: CancelSubscriptionDto, actorId: string): Promise<SubscriptionEntity> {
    const sub = await this.findOne(id);
    this.assertTransition(sub.status, 'cancelled');
    await this.subscriptionRepository.updateStatus(id, 'cancelled', {
      cancelledAt:  new Date(),
      cancelReason: dto.reason,
    });
    const updated = await this.findOne(id);
    await this.eventEmitter.emitAsync(SubscriptionEvents.CANCELLED, {
      ...this.buildPayload(updated, actorId),
      reason: dto.reason,
    });
    this.logger.log(`Subscription cancelled: ${id} tenant=${sub.tenantId}`);
    return updated;
  }

  async expire(id: string, actorId = 'scheduler'): Promise<SubscriptionEntity> {
    const sub = await this.findOne(id);
    this.assertTransition(sub.status, 'expired');
    await this.subscriptionRepository.updateStatus(id, 'expired');
    const updated = await this.findOne(id);
    await this.emitEvent(SubscriptionEvents.EXPIRED, updated, actorId);
    this.logger.log(`Subscription expired: ${id} tenant=${sub.tenantId}`);
    return updated;
  }

  async markPastDue(id: string, actorId = 'billing-webhook'): Promise<SubscriptionEntity> {
    const sub = await this.findOne(id);
    this.assertTransition(sub.status, 'past_due');
    await this.subscriptionRepository.updateStatus(id, 'past_due');
    const updated = await this.findOne(id);
    await this.emitEvent(SubscriptionEvents.PAST_DUE, updated, actorId);
    return updated;
  }

  async pause(id: string, actorId: string): Promise<SubscriptionEntity> {
    const sub = await this.findOne(id);
    this.assertTransition(sub.status, 'paused');
    await this.subscriptionRepository.updateStatus(id, 'paused');
    const updated = await this.findOne(id);
    await this.emitEvent(SubscriptionEvents.PAUSED, updated, actorId);
    return updated;
  }

  async resume(id: string, actorId: string): Promise<SubscriptionEntity> {
    const sub = await this.findOne(id);
    this.assertTransition(sub.status, 'active');
    await this.subscriptionRepository.updateStatus(id, 'active');
    const updated = await this.findOne(id);
    await this.emitEvent(SubscriptionEvents.RESUMED, updated, actorId);
    return updated;
  }

  async processExpiredTrials(): Promise<number> {
    const expired = await this.subscriptionRepository.findExpiredTrials(new Date());
    for (const sub of expired) {
      await this.expire(sub.id);
    }
    if (expired.length > 0) {
      this.logger.log(`Expired ${expired.length} trial subscription(s)`);
    }
    return expired.length;
  }

  private assertTransition(from: string, to: string): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition from "${from}" to "${to}". Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }
  }

  private async emitEvent(event: SubscriptionEvents, entity: SubscriptionEntity, actorId: string): Promise<void> {
    await this.eventEmitter.emitAsync(event, this.buildPayload(entity, actorId));
  }

  private buildPayload(entity: SubscriptionEntity, actorId: string): SubscriptionEventPayload {
    return {
      tenantId: entity.tenantId, subscriptionId: entity.id,
      packageId: entity.packageId, tierKey: entity.tierKey,
      actorId, timestamp: new Date().toISOString(),
    };
  }

  private computePeriodEnd(from: Date, cycle: string): Date {
    const d = new Date(from);
    switch (cycle) {
      case 'annual':   d.setFullYear(d.getFullYear() + 1); break;
      case 'one_time': d.setFullYear(d.getFullYear() + 100); break;
      default:         d.setMonth(d.getMonth() + 1);
    }
    return d;
  }
}
