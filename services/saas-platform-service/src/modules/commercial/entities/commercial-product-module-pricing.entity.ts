import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { CommercialProductType, PricingModelType } from '../enums/commercial.enums';

// ── CommercialProduct ─────────────────────────────────────────────────────────

/**
 * CommercialProduct — a sellable unit within the platform.
 *
 * Platform-scoped. Examples: "Court Booking Add-on", "AI Analytics Module".
 */
@Entity('commercial_products')
@Index(['sku'], { unique: true })
@Index(['productType', 'isActive'])
export class CommercialProductEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  /** Stock-keeping unit — stable identifier for downstream billing systems */
  @Column({ name: 'sku', type: 'varchar', length: 128, nullable: false })
  sku!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'product_type', type: 'varchar', length: 64, nullable: false })
  productType!: CommercialProductType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /** Feature flags/entitlements this product enables when purchased */
  @Column({ name: 'entitlements', type: 'jsonb', nullable: false, default: '{}' })
  entitlements!: Record<string, boolean>;

  @Column({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

// ── ModuleRegistry ────────────────────────────────────────────────────────────

/**
 * ModuleRegistry — catalogue of functional modules the platform exposes.
 *
 * Each module can be enabled/disabled per tenant through PackageDefinitions
 * and CommercialProducts. Platform-scoped (no tenantId).
 */
@Entity('module_registry')
@Index(['key'], { unique: true })
export class ModuleRegistryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Machine-readable module key, e.g. "booking", "analytics", "tournaments" */
  @Column({ name: 'key', type: 'varchar', length: 128, nullable: false })
  key!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: false })
  displayName!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'version', type: 'varchar', length: 32, nullable: false, default: '1.0.0' })
  version!: string;

  @Column({ name: 'is_core', type: 'boolean', default: false })
  isCore!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'dependencies', type: 'jsonb', nullable: false, default: '[]' })
  dependencies!: string[];

  @Column({ name: 'capabilities', type: 'jsonb', nullable: false, default: '{}' })
  capabilities!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── PricingModel ──────────────────────────────────────────────────────────────

/**
 * PricingModel — defines how a product or package is priced.
 *
 * All monetary values stored as integer minor currency units.
 */
@Entity('pricing_models')
@Index(['tenantId', 'modelType'])
export class PricingModelEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** NULL = platform pricing; NOT NULL = tenant-specific pricing */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'model_type', type: 'varchar', length: 64, nullable: false })
  modelType!: PricingModelType;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false, default: 'GBP' })
  currency!: string;

  /**
   * Model-specific configuration.
   * FLAT_RATE:   { amountMinor: number }
   * PER_UNIT:    { unitAmountMinor: number }
   * TIERED:      { tiers: [{upTo: number, unitAmountMinor: number}] }
   * VOLUME:      { tiers: [{upTo: number, unitAmountMinor: number}] }
   */
  @Column({ name: 'config', type: 'jsonb', nullable: false, default: '{}' })
  config!: Record<string, unknown>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
