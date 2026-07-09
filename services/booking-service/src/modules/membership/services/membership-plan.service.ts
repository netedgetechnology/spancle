import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MembershipPlanRepository }  from '../repositories/membership-plan.repository';
import { MembershipEvents }          from '../events/membership.events';
import type { CreateMembershipPlanDto, CreateBenefitDto } from '../dto/create-membership-plan.dto';
import type { UpdateMembershipPlanDto }                   from '../dto/update-membership-plan.dto';
import type { MembershipPlanEntity }                      from '../entities/membership-plan.entity';
import type { MembershipBenefitEntity }                   from '../entities/membership-benefit.entity';

@Injectable()
export class MembershipPlanService {
  private readonly logger = new Logger(MembershipPlanService.name);

  constructor(
    private readonly planRepository: MembershipPlanRepository,
    private readonly eventEmitter:   EventEmitter2,
  ) {}

  async create(
    dto:      CreateMembershipPlanDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipPlanEntity> {
    // Slug must be unique per tenant
    const existing = await this.planRepository.findBySlug(dto.slug, tenantId);
    if (existing) {
      throw new ConflictException(`A plan with slug "${dto.slug}" already exists`);
    }

    this.logger.log(`Creating membership plan "${dto.name}" — tenant: ${tenantId}`);

    const plan = await this.planRepository.create({
      tenantId,
      name:                 dto.name,
      slug:                 dto.slug.toLowerCase().trim(),
      description:          dto.description      ?? null,
      membershipType:       dto.membershipType,
      currency:             dto.currency          ?? 'GBP',
      billingCycle:         dto.billingCycle      ?? 'monthly',
      priceMinor:           dto.priceMinor        ?? 0,
      setupFeeMinor:        dto.setupFeeMinor     ?? 0,
      trialDays:            dto.trialDays         ?? 0,
      autoRenew:            dto.autoRenew         ?? true,
      gracePeriodDays:      dto.gracePeriodDays   ?? 3,
      maxMembers:           dto.maxMembers        ?? null,
      maxFamilyDependants:  dto.maxFamilyDependants ?? null,
      maxCorporateSeats:    dto.maxCorporateSeats ?? null,
      refundOnCancellation: dto.refundOnCancellation ?? false,
      isPublic:             dto.isPublic          ?? true,
      sortOrder:            dto.sortOrder         ?? 0,
      isActive:             true,
      createdById:          actorId,
      updatedById:          actorId,
    });

    // Create associated benefits
    if (dto.benefits?.length) {
      await Promise.all(
        dto.benefits.map((b, i) =>
          this.planRepository.createBenefit({
            tenantId,
            planId:               plan.id,
            benefitType:          b.benefitType,
            unitsPerPeriod:       b.unitsPerPeriod       ?? null,
            periodType:           b.periodType           ?? null,
            resetDay:             b.resetDay             ?? 1,
            rolloverAllowed:      b.rolloverAllowed      ?? false,
            maxRolloverUnits:     b.maxRolloverUnits     ?? null,
            transferable:         b.transferable         ?? false,
            expiresWithMembership: b.expiresWithMembership ?? true,
            sortOrder:            b.sortOrder            ?? i,
          }),
        ),
      );
    }

    await this.eventEmitter.emitAsync(MembershipEvents.PLAN_CREATED, {
      tenantId, planId: plan.id, actorId, timestamp: new Date().toISOString(),
    });

    return plan;
  }

  async findAll(tenantId: string, activeOnly = false): Promise<MembershipPlanEntity[]> {
    return this.planRepository.findAll(tenantId, activeOnly);
  }

  async findOne(id: string, tenantId: string): Promise<MembershipPlanEntity> {
    return this.planRepository.findByIdOrFail(id, tenantId);
  }

  async findBenefits(planId: string, tenantId: string): Promise<MembershipBenefitEntity[]> {
    await this.planRepository.findByIdOrFail(planId, tenantId); // validates plan exists
    return this.planRepository.findBenefits(planId, tenantId);
  }

  async update(
    id:       string,
    dto:      UpdateMembershipPlanDto,
    tenantId: string,
    actorId:  string,
  ): Promise<MembershipPlanEntity> {
    await this.planRepository.findByIdOrFail(id, tenantId);

    if (dto.slug) {
      const clash = await this.planRepository.findBySlug(dto.slug, tenantId);
      if (clash && clash.id !== id) {
        throw new ConflictException(`A plan with slug "${dto.slug}" already exists`);
      }
    }

    const updated = await this.planRepository.update(id, tenantId, {
      ...(dto.name            !== undefined && { name:                 dto.name            }),
      ...(dto.slug            !== undefined && { slug:                 dto.slug.toLowerCase().trim() }),
      ...(dto.description     !== undefined && { description:          dto.description     }),
      ...(dto.priceMinor      !== undefined && { priceMinor:           dto.priceMinor      }),
      ...(dto.billingCycle    !== undefined && { billingCycle:         dto.billingCycle    }),
      ...(dto.autoRenew       !== undefined && { autoRenew:            dto.autoRenew       }),
      ...(dto.gracePeriodDays !== undefined && { gracePeriodDays:      dto.gracePeriodDays }),
      ...(dto.isPublic        !== undefined && { isPublic:             dto.isPublic        }),
      ...(dto.isActive        !== undefined && { isActive:             dto.isActive        }),
      ...(dto.sortOrder       !== undefined && { sortOrder:            dto.sortOrder       }),
      updatedById: actorId,
    });

    await this.eventEmitter.emitAsync(MembershipEvents.PLAN_UPDATED, {
      tenantId, planId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async addBenefit(
    planId:   string,
    dto:      CreateBenefitDto,
    tenantId: string,
  ): Promise<MembershipBenefitEntity> {
    await this.planRepository.findByIdOrFail(planId, tenantId);
    return this.planRepository.createBenefit({
      tenantId,
      planId,
      benefitType:          dto.benefitType,
      unitsPerPeriod:       dto.unitsPerPeriod       ?? null,
      periodType:           dto.periodType           ?? null,
      resetDay:             dto.resetDay             ?? 1,
      rolloverAllowed:      dto.rolloverAllowed      ?? false,
      maxRolloverUnits:     dto.maxRolloverUnits     ?? null,
      transferable:         dto.transferable         ?? false,
      expiresWithMembership: dto.expiresWithMembership ?? true,
      sortOrder:            dto.sortOrder            ?? 0,
    });
  }

  async removeBenefit(
    benefitId: string,
    tenantId:  string,
  ): Promise<void> {
    await this.planRepository.deleteBenefit(benefitId, tenantId);
  }

  async archive(id: string, tenantId: string, actorId: string): Promise<void> {
    const plan = await this.planRepository.findByIdOrFail(id, tenantId);
    if (!plan.isActive && plan.isDeleted) {
      throw new BadRequestException('Plan is already archived');
    }
    await this.planRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(MembershipEvents.PLAN_ARCHIVED, {
      tenantId, planId: id, actorId, timestamp: new Date().toISOString(),
    });
    this.logger.log(`Plan ${id} archived — tenant: ${tenantId}`);
  }
}
