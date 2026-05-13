import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Package status lifecycle:
 *   draft     → created but not visible to tenants
 *   active    → visible and subscribable
 *   deprecated → no new subscriptions; existing subscriptions continue
 *   archived  → fully hidden; used for historical record
 */
export type PackageStatus = 'draft' | 'active' | 'deprecated' | 'archived';

/**
 * Billing cycle options for a package.
 */
export type BillingCycle = 'monthly' | 'annual' | 'one_time' | 'custom';

/**
 * PackageEntity — a platform-level product offering.
 *
 * NOT tenant-scoped — packages are global platform definitions
 * created by superadmins and subscribed to by tenants.
 * Table: `package_definitions` (avoids collision with PostgreSQL reserved word)
 *
 * Architecture:
 *   - `features` JSONB: typed feature flag booleans (mirrors PlanFeatureFlags)
 *   - `limits` JSONB:   typed resource limits (mirrors PlanResourceLimits)
 *   - `metadata` JSONB: arbitrary display/marketing data
 *   - `tierKey`: links to identity-service TenantTier enum (free/starter/etc.)
 *     When a tenant subscribes, their tenant.tier is set to this value.
 *
 * Pricing:
 *   - `priceMonthlyMinorUnits` in minor currency units (pence/cents)
 *   - `priceAnnualMinorUnits`  (annual price, typically discounted)
 *   - `currency` ISO-4217
 *   - `trialDays` — how many days the free trial lasts (0 = no trial)
 */
@Entity('package_definitions')
@Index(['status'])
@Index(['tierKey'], { unique: true })
@Index(['slug'],    { unique: true })
export class PackageEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** URL-safe slug used in API paths and frontend routing */
  @Column({ type: 'varchar', length: 63, nullable: false })
  slug!: string;

  /** Display name shown to tenants — e.g. "Pro", "Growth Plan" */
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  /** Short marketing description shown in pricing page */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Links to identity-service TenantTier.
   * Values: 'free' | 'starter' | 'growth' | 'pro' | 'enterprise'
   * Unique — one package definition per tier.
   */
  @Column({ name: 'tier_key', type: 'varchar', length: 32, nullable: false })
  tierKey!: string;

  @Column({
    type:    'enum',
    enum:    ['draft', 'active', 'deprecated', 'archived'],
    default: 'draft',
  })
  status!: PackageStatus;

  // ── Pricing ───────────────────────────────────────────────────────────────

  /** Monthly price in minor currency units (e.g. 2900 = £29.00) */
  @Column({ name: 'price_monthly_minor', type: 'int', default: 0 })
  priceMonthlyMinorUnits!: number;

  /** Annual price in minor currency units — usually discounted */
  @Column({ name: 'price_annual_minor', type: 'int', default: 0 })
  priceAnnualMinorUnits!: number;

  /** ISO-4217 currency code — e.g. 'GBP', 'USD', 'EUR' */
  @Column({ type: 'varchar', length: 3, default: 'GBP' })
  currency!: string;

  /** Number of trial days (0 = no trial) */
  @Column({ name: 'trial_days', type: 'int', default: 0 })
  trialDays!: number;

  // ── Feature flags (mirrors PlanFeatureFlags) ──────────────────────────────

  /**
   * JSONB feature flags — typed object matching PlanFeatureFlags interface.
   * These are enforced at runtime by PlanLimitGuard + plan-limits.types.ts.
   *
   * Default: all false (populated by PackageService.seedDefaults on creation).
   */
  @Column({ type: 'jsonb', nullable: false, default: '{}' })
  features!: Record<string, boolean>;

  // ── Resource limits (mirrors PlanResourceLimits) ──────────────────────────

  /**
   * JSONB resource limits — typed object matching PlanResourceLimits interface.
   * -1 = unlimited (Enterprise tier).
   *
   * Default: empty object (populated by PackageService.seedDefaults).
   */
  @Column({ type: 'jsonb', nullable: false, default: '{}' })
  limits!: Record<string, number>;

  // ── Display / marketing ───────────────────────────────────────────────────

  /** Highlighted feature bullets shown on pricing page (max 6) */
  @Column({ name: 'highlight_features', type: 'jsonb', nullable: true })
  highlightFeatures!: string[] | null;

  /** Badge text — e.g. "Most Popular", "Best Value" */
  @Column({ name: 'badge_text', type: 'varchar', length: 50, nullable: true })
  badgeText!: string | null;

  /** Whether to visually highlight this package in pricing grids */
  @Column({ name: 'is_highlighted', type: 'boolean', default: false })
  isHighlighted!: boolean;

  /** Sort order in pricing page display */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /** Arbitrary metadata for marketing / display use */
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // ── Lifecycle timestamps ──────────────────────────────────────────────────

  /** When this package was made publicly available */
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt!: Date | null;

  /** When this package was deprecated (no new subscriptions) */
  @Column({ name: 'deprecated_at', type: 'timestamptz', nullable: true })
  deprecatedAt!: Date | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
