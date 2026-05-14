import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PackageRepository } from '../repositories/package.repository';
import type { CreatePackageDto, UpdatePackageDto } from '../dto/create-package.dto';
import { PackageEntity }    from '../entities/package.entity';
import { PackageEventNames } from '../events/package.events';

/**
 * DEFAULT_PLAN_LIMITS import.
 *
 * Imported from identity-service path in monorepo.
 * Sprint 3: move to @spancle/constants package.
 */
import { DEFAULT_PLAN_LIMITS } from '../constants/plan-limits.constants';

/** State machine: allowed transitions from each status */
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft:      ['active', 'archived'],
  active:     ['deprecated', 'archived'],
  deprecated: ['archived'],
  archived:   [],
};

@Injectable()
export class PackageService {
  private readonly logger = new Logger(PackageService.name);

  constructor(
    private readonly packageRepository: PackageRepository,
    private readonly eventEmitter:      EventEmitter2,
  ) {}

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async create(dto: CreatePackageDto, actorId: string): Promise<PackageEntity> {
    if (await this.packageRepository.isSlugTaken(dto.slug)) {
      throw new ConflictException(`Package slug "${dto.slug}" is already taken`);
    }

    if (await this.packageRepository.isTierKeyTaken(dto.tierKey)) {
      throw new ConflictException(
        `A package for tier "${dto.tierKey}" already exists. Each tier can have only one package definition.`,
      );
    }

    // Seed features and limits from DEFAULT_PLAN_LIMITS if not provided
    const defaults      = DEFAULT_PLAN_LIMITS[dto.tierKey];
    const seedFeatures  = defaults?.features  ?? {};
    const seedLimits    = defaults?.resources  ?? {};

    const entity = await this.packageRepository.create({
      slug:                  dto.slug,
      name:                  dto.name,
      description:           dto.description   ?? null,
      tierKey:               dto.tierKey,
      status:                dto.status        ?? 'draft',
      priceMonthlyMinorUnits: dto.priceMonthlyMinorUnits ?? 0,
      priceAnnualMinorUnits:  dto.priceAnnualMinorUnits  ?? 0,
      currency:               dto.currency     ?? 'GBP',
      trialDays:              dto.trialDays    ?? defaults?.resources ? 0 : 14,
      // Merge DTO overrides on top of tier defaults
      features:               { ...seedFeatures,  ...(dto.features ?? {}) },
      limits:                 { ...seedLimits,     ...(dto.limits   ?? {}) },
      highlightFeatures:      dto.highlightFeatures ?? null,
      badgeText:              dto.badgeText     ?? null,
      isHighlighted:          dto.isHighlighted ?? false,
      sortOrder:              dto.sortOrder     ?? 0,
      metadata:               dto.metadata      ?? null,
    });

    await this.eventEmitter.emitAsync(PackageEventNames.CREATED, {
      packageId: entity.id,
      tierKey:   entity.tierKey,
      actorId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`Package created: ${entity.id} (${entity.slug}) by ${actorId}`);
    return entity;
  }

  async findAll(includeArchived = false): Promise<PackageEntity[]> {
    return this.packageRepository.findAll(includeArchived);
  }

  /** Public endpoint — returns only active packages for the pricing page */
  async findActive(): Promise<PackageEntity[]> {
    return this.packageRepository.findActive();
  }

  async findOne(id: string): Promise<PackageEntity> {
    const entity = await this.packageRepository.findById(id);
    if (!entity) throw new NotFoundException(`Package ${id} not found`);
    return entity;
  }

  async findBySlug(slug: string): Promise<PackageEntity> {
    const entity = await this.packageRepository.findBySlug(slug);
    if (!entity) throw new NotFoundException(`Package with slug "${slug}" not found`);
    return entity;
  }

  async update(id: string, dto: UpdatePackageDto, actorId: string): Promise<PackageEntity> {
    const existing = await this.findOne(id);

    // Status transitions go through dedicated methods — reject via update
    if (dto.status && dto.status !== existing.status) {
      throw new BadRequestException(
        `Use the dedicated status-transition endpoints (publish, deprecate, archive) to change status. ` +
        `Current: "${existing.status}", requested: "${dto.status}"`,
      );
    }

    // Merge features and limits on top of existing — never full-replace
    const updatedFeatures = dto.features
      ? { ...existing.features, ...dto.features }
      : undefined;
    const updatedLimits = dto.limits
      ? { ...existing.limits, ...dto.limits }
      : undefined;

    const updated = await this.packageRepository.update(id, {
      ...(dto.name             !== undefined && { name: dto.name }),
      ...(dto.description      !== undefined && { description: dto.description }),
      ...(dto.priceMonthlyMinorUnits !== undefined && { priceMonthlyMinorUnits: dto.priceMonthlyMinorUnits }),
      ...(dto.priceAnnualMinorUnits  !== undefined && { priceAnnualMinorUnits:  dto.priceAnnualMinorUnits }),
      ...(dto.currency         !== undefined && { currency: dto.currency }),
      ...(dto.trialDays        !== undefined && { trialDays: dto.trialDays }),
      ...(updatedFeatures      !== undefined && { features: updatedFeatures }),
      ...(updatedLimits        !== undefined && { limits: updatedLimits }),
      ...(dto.highlightFeatures !== undefined && { highlightFeatures: dto.highlightFeatures }),
      ...(dto.badgeText        !== undefined && { badgeText: dto.badgeText }),
      ...(dto.isHighlighted    !== undefined && { isHighlighted: dto.isHighlighted }),
      ...(dto.sortOrder        !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.metadata         !== undefined && { metadata: dto.metadata }),
    });

    await this.eventEmitter.emitAsync(PackageEventNames.UPDATED, {
      packageId: id, tierKey: updated.tierKey, actorId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  async publish(id: string, actorId: string): Promise<PackageEntity> {
    return this.transitionStatus(id, 'active', PackageEventNames.PUBLISHED, actorId);
  }

  async deprecate(id: string, actorId: string): Promise<PackageEntity> {
    return this.transitionStatus(id, 'deprecated', PackageEventNames.DEPRECATED, actorId);
  }

  async archive(id: string, actorId: string): Promise<PackageEntity> {
    return this.transitionStatus(id, 'archived', PackageEventNames.ARCHIVED, actorId);
  }

  // ── Seed from defaults ─────────────────────────────────────────────────────

  /**
   * Seeds the 5 default tier packages from DEFAULT_PLAN_LIMITS.
   * Safe to call multiple times — skips tiers that already have a package.
   * Returns the count of newly created packages.
   */
  async seedDefaults(actorId: string): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    const TIER_META: Record<string, {
      name: string; slug: string; sortOrder: number;
      priceMonthly: number; priceAnnual: number; trialDays: number;
      badgeText?: string; isHighlighted?: boolean;
    }> = {
      free:       { name: 'Free',       slug: 'free',       sortOrder: 0, priceMonthly: 0,      priceAnnual: 0,       trialDays: 0  },
      starter:    { name: 'Starter',    slug: 'starter',    sortOrder: 1, priceMonthly: 2900,   priceAnnual: 29000,   trialDays: 14 },
      growth:     { name: 'Growth',     slug: 'growth',     sortOrder: 2, priceMonthly: 7900,   priceAnnual: 79000,   trialDays: 14 },
      pro:        { name: 'Pro',        slug: 'pro',        sortOrder: 3, priceMonthly: 19900,  priceAnnual: 199000,  trialDays: 14, badgeText: 'Most Popular', isHighlighted: true },
      enterprise: { name: 'Enterprise', slug: 'enterprise', sortOrder: 4, priceMonthly: 0,      priceAnnual: 0,       trialDays: 30 },
    };

    for (const [tierKey, meta] of Object.entries(TIER_META)) {
      const existing = await this.packageRepository.findByTierKey(tierKey);
      if (existing) { skipped++; continue; }

      const defaults = DEFAULT_PLAN_LIMITS[tierKey];
      if (!defaults) continue;

      await this.packageRepository.create({
        slug:                  meta.slug,
        name:                  meta.name,
        tierKey,
        status:                'active',
        priceMonthlyMinorUnits: meta.priceMonthly,
        priceAnnualMinorUnits:  meta.priceAnnual,
        currency:               'GBP',
        trialDays:              meta.trialDays,
        features:               { ...defaults.features  },
        limits:                 { ...defaults.resources },
        sortOrder:              meta.sortOrder,
        badgeText:              meta.badgeText  ?? null,
        isHighlighted:          meta.isHighlighted ?? false,
        publishedAt:            new Date(),
        isDeleted:              false,
      });

      created++;
    }

    await this.eventEmitter.emitAsync(PackageEventNames.SEEDED, {
      count: created, actorId, timestamp: new Date().toISOString(),
    });

    this.logger.log(`Package seed: created=${created} skipped=${skipped} by ${actorId}`);
    return { created, skipped };
  }

  /**
   * Clones an existing package — creates a draft copy.
   * Useful for creating custom variations of a standard tier.
   */
  async clone(id: string, newSlug: string, actorId: string): Promise<PackageEntity> {
    const source = await this.findOne(id);

    if (await this.packageRepository.isSlugTaken(newSlug)) {
      throw new ConflictException(`Slug "${newSlug}" is already taken`);
    }

    const cloned = await this.packageRepository.create({
      slug:                  newSlug,
      name:                  `${source.name} (Copy)`,
      description:           source.description,
      tierKey:               source.tierKey,
      status:                'draft',
      priceMonthlyMinorUnits: source.priceMonthlyMinorUnits,
      priceAnnualMinorUnits:  source.priceAnnualMinorUnits,
      currency:               source.currency,
      trialDays:              source.trialDays,
      features:               { ...source.features },
      limits:                 { ...source.limits },
      highlightFeatures:      source.highlightFeatures ? [...source.highlightFeatures] : null,
      badgeText:              null,
      isHighlighted:          false,
      sortOrder:              source.sortOrder + 1,
      metadata:               source.metadata,
      isDeleted:              false,
    });

    await this.eventEmitter.emitAsync(PackageEventNames.CREATED, {
      packageId: cloned.id, tierKey: cloned.tierKey, actorId,
      timestamp: new Date().toISOString(),
    });

    return cloned;
  }

  async remove(id: string, actorId: string): Promise<void> {
    const pkg = await this.findOne(id);
    if (pkg.status === 'active') {
      throw new BadRequestException('Cannot delete an active package. Deprecate or archive it first.');
    }
    await this.packageRepository.softDelete(id);
    await this.eventEmitter.emitAsync(PackageEventNames.DELETED, {
      packageId: id, tierKey: pkg.tierKey, actorId, timestamp: new Date().toISOString(),
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async transitionStatus(
    id:         string,
    to:         string,
    eventName:  PackageEventNames,
    actorId:    string,
  ): Promise<PackageEntity> {
    const pkg = await this.findOne(id);
    const allowed = ALLOWED_TRANSITIONS[pkg.status] ?? [];

    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition from "${pkg.status}" to "${to}". ` +
        `Allowed transitions: [${allowed.join(', ') || 'none'}]`,
      );
    }

    await this.packageRepository.updateStatus(id, to as PackageEntity['status']);
    const updated = await this.findOne(id);

    await this.eventEmitter.emitAsync(eventName, {
      packageId: id, tierKey: pkg.tierKey, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }
}
