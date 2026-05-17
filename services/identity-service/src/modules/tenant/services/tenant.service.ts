import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  CreateTenantDto,
  Tenant,
  TenantSettings,
  TenantStatus,
  TenantTier,
} from '@spancle/types';
import { TenantSettingsSchema } from '@spancle/types';
import { TenantRepository }  from '../repositories/tenant.repository';
import { TenantEntity }      from '../entities/tenant.entity';
import type { PlanLimits }   from '../types/plan-limits.types';
import { DEFAULT_PLAN_LIMITS } from '../types/plan-limits.types';

/**
 * TenantService — tenant lifecycle management.
 *
 * Exposes:
 *   - CRUD operations for the superadmin portal
 *   - Resolution methods used by TenantResolverMiddleware
 *   - Plan limit resolution for TenantContextRuntime construction
 *   - Status transition methods with event emission
 */
@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly tenantRepository: TenantRepository,
    private readonly eventEmitter:     EventEmitter2,
  ) {}

  // ── Resolution (called by TenantResolverMiddleware) ────────────────────────

  async findById(id: string): Promise<TenantEntity | null> {
    return this.tenantRepository.findRawById(id);
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    return this.tenantRepository.findBySlug(slug);
  }

  /**
   * Resolves plan limits for a given tier.
   * Falls back to 'free' limits if tier is unrecognised.
   * Sprint 3: allow per-tenant limit overrides stored in JSONB.
   */
  resolvePlanLimits(tier: TenantTier): PlanLimits {
    return DEFAULT_PLAN_LIMITS[tier] ?? DEFAULT_PLAN_LIMITS['free']!;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreateTenantDto): Promise<TenantEntity> {
    // Slug uniqueness
    const slugTaken = await this.tenantRepository.isSlugTaken(dto.slug);
    if (slugTaken) {
      throw new ConflictException(`Tenant slug "${dto.slug}" is already taken`);
    }

    // Email uniqueness
    const emailTaken = await this.tenantRepository.findByEmail(dto.email);
    if (emailTaken) {
      throw new ConflictException(`A tenant with email "${dto.email}" already exists`);
    }

    // Merge provided settings with defaults
    const defaultSettings = TenantSettingsSchema.parse({});
    const mergedSettings: TenantSettings = {
      ...defaultSettings,
      ...(dto.settings ?? {}),
    };

    const entity = await this.tenantRepository.entityManager
      .getRepository(TenantEntity)
      .save(
        this.tenantRepository.entityManager
          .getRepository(TenantEntity)
          .create({
            name:      dto.name,
            slug:      dto.slug.toLowerCase(),
            email:     dto.email,
            phone:     dto.phone ?? null,
            tier:      dto.tier ?? 'trial',
            status:    'pending',
            settings:  mergedSettings,
            isDeleted: false,
          }),
      );

    await this.eventEmitter.emitAsync('spancle.tenant.created', {
      tenantId:   entity.id,
      name:       entity.name,
      slug:       entity.slug,
      tier:       entity.tier,
      ownerEmail: entity.email,
      timestamp:  new Date().toISOString(),
    });

    this.logger.log(`Tenant created: ${entity.id} (${entity.slug})`);
    return entity;
  }


  /**
   * Resolves a tenant by slug or admin email.
   * Used by the tenant finder at www.spancle.com/login.
   * Returns minimal public data only — no sensitive fields.
   */
  async resolveTenant(
    q: string,
  ): Promise<{ slug: string; name: string; redirectUrl: string } | null> {
    const q_lower = q.toLowerCase().trim();

    // Try slug first
    let tenant = await this.tenantRepository.findBySlug(q_lower);

    // Then try email
    if (!tenant) {
      tenant = await this.tenantRepository.findByEmail(q_lower);
    }

    if (!tenant || tenant.isDeleted) return null;

    return {
      slug:        tenant.slug,
      name:        tenant.name,
      redirectUrl: `https://${tenant.slug}.spancle.com`,
    };
  }

  async findAll(
    page = 1, limit = 20,
    status?: TenantStatus, tier?: TenantTier,
  ): Promise<{ data: TenantEntity[]; total: number }> {
    return this.tenantRepository.findAllTenants(page, limit, status, tier);
  }

  async getById(tenantId: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepository.findRawById(tenantId);
    if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found`);
    return tenant;
  }

  async update(
    tenantId: string,
    dto: Partial<Pick<CreateTenantDto, 'name' | 'email' | 'phone'>>,
  ): Promise<TenantEntity> {
    const tenant = await this.getById(tenantId);

    Object.assign(tenant, {
      ...(dto.name  && { name: dto.name }),
      ...(dto.email && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      updatedAt: new Date(),
    });

    const updated = await this.tenantRepository.entityManager
      .getRepository(TenantEntity)
      .save(tenant);

    await this.eventEmitter.emitAsync('spancle.tenant.updated', {
      tenantId: updated.id,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  async updateSettings(
    tenantId: string,
    settings: Partial<TenantSettings>,
  ): Promise<TenantEntity> {
    const tenant = await this.getById(tenantId);

    const mergedSettings = TenantSettingsSchema.parse({
      ...tenant.settings,
      ...settings,
    });

    tenant.settings  = mergedSettings;
    tenant.updatedAt = new Date();

    const updated = await this.tenantRepository.entityManager
      .getRepository(TenantEntity)
      .save(tenant);

    await this.eventEmitter.emitAsync('spancle.tenant.updated', {
      tenantId: updated.id,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  async activate(tenantId: string, actorId: string): Promise<TenantEntity> {
    return this.transitionStatus(tenantId, 'active', actorId, 'spancle.tenant.activated');
  }

  async suspend(tenantId: string, actorId: string, reason: string): Promise<TenantEntity> {
    const tenant = await this.transitionStatus(tenantId, 'suspended', actorId, 'spancle.tenant.suspended');
    this.logger.warn(`Tenant suspended: ${tenantId} by: ${actorId} reason: ${reason}`);
    return tenant;
  }

  async terminate(tenantId: string, actorId: string, reason: string): Promise<TenantEntity> {
    const tenant = await this.transitionStatus(tenantId, 'terminated', actorId, 'spancle.tenant.terminated');
    this.logger.warn(`Tenant terminated: ${tenantId} by: ${actorId} reason: ${reason}`);
    return tenant;
  }

  async changeTier(
    tenantId: string,
    newTier:  TenantTier,
    actorId:  string,
  ): Promise<TenantEntity> {
    const tenant = await this.getById(tenantId);
    const oldTier = tenant.tier;

    await this.tenantRepository.updateTier(tenantId, newTier);
    const updated = await this.getById(tenantId);

    await this.eventEmitter.emitAsync('spancle.tenant.tier_changed', {
      tenantId,
      previousTier: oldTier,
      newTier,
      actorId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `Tenant ${tenantId} tier changed: ${oldTier} → ${newTier} by ${actorId}`,
    );

    return updated;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async transitionStatus(
    tenantId:  string,
    newStatus: TenantStatus,
    actorId:   string,
    eventName: string,
  ): Promise<TenantEntity> {
    await this.getById(tenantId); // validate existence

    await this.tenantRepository.updateStatus(tenantId, newStatus);
    const updated = await this.getById(tenantId);

    await this.eventEmitter.emitAsync(eventName, {
      tenantId,
      newStatus,
      actorId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }
}
