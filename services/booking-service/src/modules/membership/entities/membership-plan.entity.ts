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
 * Billing cycle — determines how often the plan renews.
 * 'lifetime' means the membership never renews (renewsAt = null).
 */
export type BillingCycle = 'monthly' | 'quarterly' | 'annual' | 'lifetime';

/**
 * MembershipPlanEntity — a tenant-owned plan template.
 *
 * Multiple members can enrol in the same plan.
 * Changing a plan does NOT retroactively alter active memberships.
 * Active memberships hold a benefit_snapshot taken at enrolment time.
 *
 * Table: membership_plans
 */
@Entity('membership_plans')
@Index(['tenantId', 'slug'], { unique: true, where: '"is_deleted" = false' })
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'isDeleted'])
export class MembershipPlanEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  /**
   * URL-safe slug — unique per tenant.
   * Used for display and plan family grouping (e.g. 'gold', 'platinum').
   */
  @Column({ type: 'varchar', length: 100, nullable: false })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Discriminator for plan category.
   * Stored as varchar (not enum) for forward-compatibility.
   * Valid values: individual | family | corporate | academy | vip | lifetime | trial
   */
  @Column({ name: 'membership_type', type: 'varchar', length: 50, nullable: false })
  membershipType!: string;

  /** ISO-4217 currency code */
  @Column({ type: 'varchar', length: 3, nullable: false, default: 'GBP' })
  currency!: string;

  @Column({
    name: 'billing_cycle',
    type: 'varchar',
    length: 20,
    nullable: false,
    default: 'monthly',
  })
  billingCycle!: BillingCycle;

  /** Recurring price in minor currency units (pence/cents). 0 = free. */
  @Column({ name: 'price_minor', type: 'int', nullable: false, default: 0 })
  priceMinor!: number;

  /** One-time fee on first enrolment, minor units. 0 = none. */
  @Column({ name: 'setup_fee_minor', type: 'int', nullable: false, default: 0 })
  setupFeeMinor!: number;

  /** Days of free trial before first charge. 0 = no trial. */
  @Column({ name: 'trial_days', type: 'int', nullable: false, default: 0 })
  trialDays!: number;

  /** Whether memberships on this plan auto-renew by default. */
  @Column({ name: 'auto_renew', type: 'boolean', nullable: false, default: true })
  autoRenew!: boolean;

  /** Days after renewsAt before membership expires. */
  @Column({ name: 'grace_period_days', type: 'int', nullable: false, default: 3 })
  gracePeriodDays!: number;

  /** Maximum total active memberships for this plan. null = unlimited. */
  @Column({ name: 'max_members', type: 'int', nullable: true })
  maxMembers!: number | null;

  /** Maximum dependants for family plans. null = not a family plan. */
  @Column({ name: 'max_family_dependants', type: 'int', nullable: true })
  maxFamilyDependants!: number | null;

  /** Maximum seats for corporate plans. null = not a corporate plan. */
  @Column({ name: 'max_corporate_seats', type: 'int', nullable: true })
  maxCorporateSeats!: number | null;

  /** Whether a pro-rata refund is issued on cancellation. */
  @Column({ name: 'refund_on_cancellation', type: 'boolean', nullable: false, default: false })
  refundOnCancellation!: boolean;

  /** Visible on the member portal / public website. */
  @Column({ name: 'is_public', type: 'boolean', nullable: false, default: true })
  isPublic!: boolean;

  @Column({ name: 'sort_order', type: 'int', nullable: false, default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive!: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', nullable: false, default: false })
  isDeleted!: boolean;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
