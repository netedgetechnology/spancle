import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlanRepository }  from '../repositories/plan.repository';
import { PackageService }  from '../../package/services/package.service';
import type { CreatePlanDto } from '../dto/create-plan.dto';
import type { UpdatePlanDto }  from '../dto/update-plan.dto';
import { PlanEntity }      from '../entities/plan.entity';
import { PlanEvents }      from '../events/plan.events';

@Injectable()
export class PlanService {
  private readonly logger = new Logger(PlanService.name);

  constructor(
    private readonly planRepository: PlanRepository,
    private readonly packageService: PackageService,
    private readonly eventEmitter:   EventEmitter2,
  ) {}

  /**
   * Upserts the active plan for a tenant.
   * Called by SubscriptionService when a subscription is activated.
   * Deactivates any previous plan before creating the new one.
   */
  async upsertForTenant(dto: CreatePlanDto, actorId: string): Promise<PlanEntity> {
    // Verify the package exists
    await this.packageService.findOne(dto.packageId);

    // Deactivate existing plan
    await this.planRepository.deactivateByTenant(dto.tenantId);

    const entity = await this.planRepository.create({
      tenantId:         dto.tenantId,
      packageId:        dto.packageId,
      tierKey:          dto.tierKey,
      featureOverrides: dto.featureOverrides ?? {},
      limitOverrides:   dto.limitOverrides   ?? {},
      isActive:         true,
      isDeleted:        false,
    });

    await this.eventEmitter.emitAsync(PlanEvents.CREATED, {
      tenantId: dto.tenantId, planId: entity.id, actorId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Plan created for tenant ${dto.tenantId} → tier=${dto.tierKey}`);
    return entity;
  }

  async findForTenant(tenantId: string): Promise<PlanEntity | null> {
    return this.planRepository.findByTenant(tenantId);
  }

  async findOne(id: string): Promise<PlanEntity> {
    const entity = await this.planRepository.findById(id);
    if (!entity) throw new NotFoundException(`Plan ${id} not found`);
    return entity;
  }

  /**
   * Updates feature/limit overrides for a tenant plan.
   * Used by superadmin to grant enterprise-custom limits.
   * Merges on top of existing overrides — never full-replaces.
   */
  async updateOverrides(id: string, dto: UpdatePlanDto, actorId: string): Promise<PlanEntity> {
    const plan = await this.findOne(id);

    const updated = await this.planRepository.update(id, {
      ...(dto.featureOverrides !== undefined && {
        featureOverrides: { ...plan.featureOverrides, ...dto.featureOverrides },
      }),
      ...(dto.limitOverrides !== undefined && {
        limitOverrides: { ...plan.limitOverrides, ...dto.limitOverrides },
      }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    });

    await this.eventEmitter.emitAsync(PlanEvents.UPDATED, {
      tenantId: plan.tenantId, planId: id, actorId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Returns the effective resolved limits for a tenant.
   * Merges package.limits with plan.limitOverrides (overrides win).
   */
  async getEffectiveLimits(tenantId: string): Promise<{
    features: Record<string, boolean>;
    limits:   Record<string, number>;
    tierKey:  string;
  }> {
    const plan = await this.planRepository.findByTenant(tenantId);

    if (!plan) {
      // Fallback to free tier defaults
      return {
        features: {},
        limits:   {},
        tierKey:  'free',
      };
    }

    const pkg = await this.packageService.findOne(plan.packageId);

    return {
      tierKey:  plan.tierKey,
      features: { ...pkg.features, ...plan.featureOverrides },
      limits:   { ...pkg.limits,   ...plan.limitOverrides   },
    };
  }

  async remove(id: string, actorId: string): Promise<void> {
    await this.findOne(id);
    await this.planRepository.softDelete(id);
    await this.eventEmitter.emitAsync(PlanEvents.DELETED, {
      planId: id, actorId, timestamp: new Date().toISOString(),
    });
  }
}
