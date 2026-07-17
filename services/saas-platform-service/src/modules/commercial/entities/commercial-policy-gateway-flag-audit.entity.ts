import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import {
  CommercialAuditAction,
  FeatureFlagStatus,
  GatewayScope,
  GatewayType,
  PaymentOwnershipType,
  RevenueDistributionType,
} from '../enums/commercial.enums';

// ── PaymentOwnershipPolicy ────────────────────────────────────────────────────

/**
 * PaymentOwnershipPolicy — defines who owns the payment flow for a given context.
 *
 * Determines whether the platform or the tenant holds the merchant account.
 */
@Entity('payment_ownership_policies')
@Index(['tenantId', 'ownershipType'])
export class PaymentOwnershipPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** NULL = platform-wide default; NOT NULL = tenant-specific override */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'ownership_type', type: 'varchar', length: 32, nullable: false })
  ownershipType!: PaymentOwnershipType;

  /**
   * Platform share in basis points (100 = 1%). Used when ownershipType = SPLIT.
   * Must be between 0 and 10000. INT only.
   */
  @Column({ name: 'platform_share_bps', type: 'int', nullable: false, default: 0 })
  platformShareBps!: number;

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

// ── RevenueDistributionPolicy ─────────────────────────────────────────────────

/**
 * RevenueDistributionPolicy — defines how revenue is split between parties.
 *
 * All rate values stored as basis points (INT). No DECIMAL/FLOAT.
 */
@Entity('revenue_distribution_policies')
@Index(['tenantId', 'distributionType'])
export class RevenueDistributionPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ name: 'distribution_type', type: 'varchar', length: 64, nullable: false })
  distributionType!: RevenueDistributionType;

  /**
   * Distribution tiers. Each tier: { upToMinor: number | null, rateBps: number }
   * rateBps: basis points (100 = 1%). INT only.
   */
  @Column({ name: 'tiers', type: 'jsonb', nullable: false, default: '[]' })
  tiers!: Array<{ upToMinor: number | null; rateBps: number }>;

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

// ── GatewayDefinition ─────────────────────────────────────────────────────────

/**
 * GatewayDefinition — a payment gateway that the platform supports.
 *
 * Platform-scoped. One row per gateway type. Describes capabilities and
 * supported currencies.
 */
@Entity('gateway_definitions')
@Index(['gatewayType'], { unique: true })
export class GatewayDefinitionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'gateway_type', type: 'varchar', length: 64, nullable: false })
  gatewayType!: GatewayType;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: false })
  displayName!: string;

  @Column({ name: 'supported_currencies', type: 'jsonb', nullable: false, default: '[]' })
  supportedCurrencies!: string[];

  @Column({ name: 'capabilities', type: 'jsonb', nullable: false, default: '{}' })
  capabilities!: Record<string, unknown>;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'config_schema', type: 'jsonb', nullable: false, default: '{}' })
  configSchema!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── GatewayCredential ─────────────────────────────────────────────────────────

/**
 * GatewayCredential — a set of credentials for a gateway, scoped to platform
 * or a specific tenant.
 *
 * SECURITY: secretConfig must be encrypted at rest before storage.
 * This entity stores the encrypted ciphertext only.
 */
@Entity('gateway_credentials')
@Index(['tenantId', 'gatewayDefinitionId'], { unique: true })
export class GatewayCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** NULL = platform-level credentials; NOT NULL = tenant-level override */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  /** FK-equivalent → gateway_definitions.id */
  @Column({ name: 'gateway_definition_id', type: 'uuid', nullable: false })
  gatewayDefinitionId!: string;

  @Column({ name: 'scope', type: 'varchar', length: 32, nullable: false })
  scope!: GatewayScope;

  /** Non-secret config (publishable keys, webhook endpoints, etc.) */
  @Column({ name: 'public_config', type: 'jsonb', nullable: false, default: '{}' })
  publicConfig!: Record<string, unknown>;

  /**
   * Encrypted ciphertext of secret keys.
   * NEVER store plaintext here. Application must decrypt at runtime.
   */
  @Column({ name: 'secret_config_encrypted', type: 'text', nullable: true })
  secretConfigEncrypted!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── FeatureFlag ───────────────────────────────────────────────────────────────

/**
 * FeatureFlag — runtime feature toggles, optionally scoped to a tenant.
 */
@Entity('feature_flags')
@Index(['tenantId', 'key'], { unique: true })
export class FeatureFlagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** NULL = platform-wide flag; NOT NULL = tenant override */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ name: 'key', type: 'varchar', length: 128, nullable: false })
  key!: string;

  @Column({ name: 'status', type: 'varchar', length: 32, nullable: false, default: FeatureFlagStatus.DISABLED })
  status!: FeatureFlagStatus;

  /** For GRADUAL rollouts: percentage of tenants/users to enable (0–100) */
  @Column({ name: 'rollout_percentage', type: 'int', nullable: false, default: 0 })
  rolloutPercentage!: number;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── CommercialAudit ───────────────────────────────────────────────────────────

/**
 * CommercialAudit — append-only audit log for all commercial-engine mutations.
 *
 * INSERT-only. Never updated or deleted.
 */
@Entity('commercial_audit')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'action'])
@Index(['tenantId', 'targetId'])
export class CommercialAuditEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  @Index()
  tenantId!: string | null;

  @Column({ name: 'action', type: 'varchar', length: 64, nullable: false })
  action!: CommercialAuditAction;

  /** Table or entity type being audited */
  @Column({ name: 'target_type', type: 'varchar', length: 64, nullable: false })
  targetType!: string;

  @Column({ name: 'target_id', type: 'uuid', nullable: false })
  targetId!: string;

  /** Previous state snapshot */
  @Column({ name: 'before_state', type: 'jsonb', nullable: true })
  beforeState!: Record<string, unknown> | null;

  /** New state snapshot */
  @Column({ name: 'after_state', type: 'jsonb', nullable: true })
  afterState!: Record<string, unknown> | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ name: 'actor_role', type: 'varchar', length: 64, nullable: true })
  actorRole!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: false, default: '{}' })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
