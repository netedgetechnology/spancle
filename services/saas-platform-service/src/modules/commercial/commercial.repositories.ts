import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, type Repository } from 'typeorm';
import { CommercialRuleEntity } from './entities/commercial-rule.entity';
import { CommercialRuleVersionEntity } from './entities/commercial-rule-version.entity';
import {
  CommercialDecisionSnapshotEntity,
  PackageDefinitionEntity,
  PackageVersionEntity,
} from './entities/commercial-snapshot-and-package.entity';
import {
  CommercialProductEntity,
  ModuleRegistryEntity,
  PricingModelEntity,
} from './entities/commercial-product-module-pricing.entity';
import {
  CommercialAuditEntity,
  FeatureFlagEntity,
  GatewayCredentialEntity,
  GatewayDefinitionEntity,
  PaymentOwnershipPolicyEntity,
  RevenueDistributionPolicyEntity,
} from './entities/commercial-policy-gateway-flag-audit.entity';
import { CommercialRuleStatus } from './enums/commercial.enums';

// ── CommercialRuleRepository ──────────────────────────────────────────────────

@Injectable()
export class CommercialRuleRepository {
  private readonly logger = new Logger(CommercialRuleRepository.name);

  constructor(
    @InjectRepository(CommercialRuleEntity)
    private readonly repo: Repository<CommercialRuleEntity>,
  ) {}

  async create(data: Partial<CommercialRuleEntity>): Promise<CommercialRuleEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string): Promise<CommercialRuleEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async findByIdOrFail(id: string): Promise<CommercialRuleEntity> {
    const entity = await this.findById(id);
    if (!entity) throw new NotFoundException(`CommercialRule ${id} not found`);
    return entity;
  }

  async findByTenant(tenantId: string | null): Promise<CommercialRuleEntity[]> {
    return this.repo.find({ where: { tenantId: tenantId ?? IsNull(), isDeleted: false } });
  }

  async findActiveByTenant(tenantId: string | null): Promise<CommercialRuleEntity[]> {
    return this.repo.find({
      where: { tenantId: tenantId ?? IsNull(), status: CommercialRuleStatus.ACTIVE, isDeleted: false },
    });
  }

  async update(id: string, data: Partial<CommercialRuleEntity>): Promise<CommercialRuleEntity> {
    await this.repo.update({ id }, data as any);
    return this.findByIdOrFail(id);
  }

  async softDelete(id: string, actorId: string): Promise<void> {
    await this.repo.update({ id }, { isDeleted: true, deletedAt: new Date(), updatedById: actorId });
  }
}

// ── CommercialRuleVersionRepository ──────────────────────────────────────────

@Injectable()
export class CommercialRuleVersionRepository {
  constructor(
    @InjectRepository(CommercialRuleVersionEntity)
    private readonly repo: Repository<CommercialRuleVersionEntity>,
  ) {}

  async create(data: Partial<CommercialRuleVersionEntity>): Promise<CommercialRuleVersionEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByRule(ruleId: string): Promise<CommercialRuleVersionEntity[]> {
    return this.repo.find({ where: { ruleId }, order: { createdAt: 'DESC' } });
  }

  async findByRuleAndVersion(ruleId: string, version: string): Promise<CommercialRuleVersionEntity | null> {
    return this.repo.findOne({ where: { ruleId, version } });
  }
}

// ── CommercialDecisionSnapshotRepository ─────────────────────────────────────

@Injectable()
export class CommercialDecisionSnapshotRepository {
  constructor(
    @InjectRepository(CommercialDecisionSnapshotEntity)
    private readonly repo: Repository<CommercialDecisionSnapshotEntity>,
  ) {}

  async create(data: Partial<CommercialDecisionSnapshotEntity>): Promise<CommercialDecisionSnapshotEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findBySubject(tenantId: string | null, subjectType: string, subjectId: string): Promise<CommercialDecisionSnapshotEntity[]> {
    return this.repo.find({
      where: { tenantId: tenantId ?? IsNull(), subjectType, subjectId },
      order: { createdAt: 'DESC' },
    });
  }

  async findByRule(tenantId: string | null, ruleId: string): Promise<CommercialDecisionSnapshotEntity[]> {
    return this.repo.find({
      where: { tenantId: tenantId ?? IsNull(), ruleId },
      order: { createdAt: 'DESC' },
    });
  }
}

// ── PackageDefinitionRepository ───────────────────────────────────────────────

@Injectable()
export class PackageDefinitionRepository {
  constructor(
    @InjectRepository(PackageDefinitionEntity)
    private readonly repo: Repository<PackageDefinitionEntity>,
  ) {}

  async create(data: Partial<PackageDefinitionEntity>): Promise<PackageDefinitionEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAll(): Promise<PackageDefinitionEntity[]> {
    return this.repo.find({ where: { isDeleted: false }, order: { sortOrder: 'ASC' } });
  }

  async findById(id: string): Promise<PackageDefinitionEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async findBySlug(slug: string): Promise<PackageDefinitionEntity | null> {
    return this.repo.findOne({ where: { slug, isDeleted: false } });
  }

  async update(id: string, data: Partial<PackageDefinitionEntity>): Promise<PackageDefinitionEntity> {
    await this.repo.update({ id }, data as any);
    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException(`PackageDefinition ${id} not found`);
    return updated;
  }
}

// ── PackageVersionRepository ──────────────────────────────────────────────────

@Injectable()
export class PackageVersionRepository {
  constructor(
    @InjectRepository(PackageVersionEntity)
    private readonly repo: Repository<PackageVersionEntity>,
  ) {}

  async create(data: Partial<PackageVersionEntity>): Promise<PackageVersionEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByPackage(packageDefinitionId: string): Promise<PackageVersionEntity[]> {
    return this.repo.find({ where: { packageDefinitionId }, order: { createdAt: 'DESC' } });
  }

  async findByPackageAndVersion(packageDefinitionId: string, version: string): Promise<PackageVersionEntity | null> {
    return this.repo.findOne({ where: { packageDefinitionId, version } });
  }
}

// ── CommercialProductRepository ───────────────────────────────────────────────

@Injectable()
export class CommercialProductRepository {
  constructor(
    @InjectRepository(CommercialProductEntity)
    private readonly repo: Repository<CommercialProductEntity>,
  ) {}

  async create(data: Partial<CommercialProductEntity>): Promise<CommercialProductEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAll(): Promise<CommercialProductEntity[]> {
    return this.repo.find({ where: { isDeleted: false } });
  }

  async findById(id: string): Promise<CommercialProductEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async findBySku(sku: string): Promise<CommercialProductEntity | null> {
    return this.repo.findOne({ where: { sku, isDeleted: false } });
  }
}

// ── ModuleRegistryRepository ──────────────────────────────────────────────────

@Injectable()
export class ModuleRegistryRepository {
  constructor(
    @InjectRepository(ModuleRegistryEntity)
    private readonly repo: Repository<ModuleRegistryEntity>,
  ) {}

  async findAll(): Promise<ModuleRegistryEntity[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  async findByKey(key: string): Promise<ModuleRegistryEntity | null> {
    return this.repo.findOne({ where: { key } });
  }

  async upsert(data: Partial<ModuleRegistryEntity>): Promise<ModuleRegistryEntity> {
    const existing = data.key ? await this.findByKey(data.key) : null;
    if (existing) {
      await this.repo.update({ id: existing.id }, data as any);
      return this.repo.findOneOrFail({ where: { id: existing.id } });
    }
    return this.repo.save(this.repo.create(data));
  }
}

// ── PricingModelRepository ────────────────────────────────────────────────────

@Injectable()
export class PricingModelRepository {
  constructor(
    @InjectRepository(PricingModelEntity)
    private readonly repo: Repository<PricingModelEntity>,
  ) {}

  async create(data: Partial<PricingModelEntity>): Promise<PricingModelEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findById(id: string): Promise<PricingModelEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async findByTenant(tenantId: string | null): Promise<PricingModelEntity[]> {
    return this.repo.find({ where: { tenantId: tenantId ?? IsNull(), isActive: true, isDeleted: false } });
  }
}

// ── PaymentOwnershipPolicyRepository ─────────────────────────────────────────

@Injectable()
export class PaymentOwnershipPolicyRepository {
  constructor(
    @InjectRepository(PaymentOwnershipPolicyEntity)
    private readonly repo: Repository<PaymentOwnershipPolicyEntity>,
  ) {}

  async create(data: Partial<PaymentOwnershipPolicyEntity>): Promise<PaymentOwnershipPolicyEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByTenant(tenantId: string | null): Promise<PaymentOwnershipPolicyEntity[]> {
    return this.repo.find({ where: { tenantId: tenantId ?? IsNull(), isActive: true, isDeleted: false } });
  }
}

// ── RevenueDistributionPolicyRepository ──────────────────────────────────────

@Injectable()
export class RevenueDistributionPolicyRepository {
  constructor(
    @InjectRepository(RevenueDistributionPolicyEntity)
    private readonly repo: Repository<RevenueDistributionPolicyEntity>,
  ) {}

  async create(data: Partial<RevenueDistributionPolicyEntity>): Promise<RevenueDistributionPolicyEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByTenant(tenantId: string | null): Promise<RevenueDistributionPolicyEntity[]> {
    return this.repo.find({ where: { tenantId: tenantId ?? IsNull(), isActive: true, isDeleted: false } });
  }
}

// ── GatewayDefinitionRepository ───────────────────────────────────────────────

@Injectable()
export class GatewayDefinitionRepository {
  constructor(
    @InjectRepository(GatewayDefinitionEntity)
    private readonly repo: Repository<GatewayDefinitionEntity>,
  ) {}

  async findAll(): Promise<GatewayDefinitionEntity[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  async findById(id: string): Promise<GatewayDefinitionEntity | null> {
    return this.repo.findOne({ where: { id } });
  }
}

// ── GatewayCredentialRepository ───────────────────────────────────────────────

@Injectable()
export class GatewayCredentialRepository {
  constructor(
    @InjectRepository(GatewayCredentialEntity)
    private readonly repo: Repository<GatewayCredentialEntity>,
  ) {}

  async upsert(data: Partial<GatewayCredentialEntity>): Promise<GatewayCredentialEntity> {
    const existing = await this.repo.findOne({
      where: { tenantId: data.tenantId ? data.tenantId : IsNull(), gatewayDefinitionId: data.gatewayDefinitionId },
    });
    if (existing) {
      await this.repo.update({ id: existing.id }, data as any);
      return this.repo.findOneOrFail({ where: { id: existing.id } });
    }
    return this.repo.save(this.repo.create(data));
  }

  async findByTenant(tenantId: string | null): Promise<GatewayCredentialEntity[]> {
    return this.repo.find({ where: { tenantId: tenantId ? tenantId : IsNull(), isActive: true } });
  }
}

// ── FeatureFlagRepository ─────────────────────────────────────────────────────

@Injectable()
export class FeatureFlagRepository {
  constructor(
    @InjectRepository(FeatureFlagEntity)
    private readonly repo: Repository<FeatureFlagEntity>,
  ) {}

  async upsert(data: Partial<FeatureFlagEntity>): Promise<FeatureFlagEntity> {
    const existing = await this.repo.findOne({
      where: { tenantId: data.tenantId ? data.tenantId : IsNull(), key: data.key },
    });
    if (existing) {
      await this.repo.update({ id: existing.id }, data as any);
      return this.repo.findOneOrFail({ where: { id: existing.id } });
    }
    return this.repo.save(this.repo.create(data));
  }

  async findByTenant(tenantId: string | null): Promise<FeatureFlagEntity[]> {
    return this.repo.find({ where: { tenantId: tenantId ?? IsNull() } });
  }

  async findByKey(tenantId: string | null, key: string): Promise<FeatureFlagEntity | null> {
    return this.repo.findOne({ where: { tenantId: tenantId ?? IsNull(), key } });
  }
}

// ── CommercialAuditRepository ─────────────────────────────────────────────────

@Injectable()
export class CommercialAuditRepository {
  constructor(
    @InjectRepository(CommercialAuditEntity)
    private readonly repo: Repository<CommercialAuditEntity>,
  ) {}

  /** Append-only: creates an audit log entry. Never updates or deletes. */
  async log(data: Partial<CommercialAuditEntity>): Promise<CommercialAuditEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findByTenant(tenantId: string | null, limit = 50): Promise<CommercialAuditEntity[]> {
    return this.repo.find({
      where: { tenantId: tenantId ?? IsNull() },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async findByTarget(targetId: string, limit = 50): Promise<CommercialAuditEntity[]> {
    return this.repo.find({
      where: { targetId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
