import {
  Column, CreateDateColumn, DeleteDateColumn,
  Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * Subscription lifecycle state machine:
 *   trialing  → Trial period, no payment required
 *   active    → Paid and in good standing
 *   past_due  → Payment failed, grace period
 *   cancelled → Cancelled by tenant (access until periodEnd)
 *   expired   → Trial ended without conversion OR past_due resolved by expiry
 *   paused    → Temporarily suspended by admin
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'paused';

export type SubscriptionBillingCycle = 'monthly' | 'annual' | 'one_time' | 'custom';

/**
 * SubscriptionEntity — a tenant's subscription to a Package.
 *
 * One active subscription per tenant at any time.
 * Historical subscriptions are kept (is_deleted = false, status = cancelled/expired).
 *
 * Lifecycle:
 *   new tenant → trialing (if trialDays > 0) or active (free tier)
 *   trial ends → active (if payment provided) or expired (no payment)
 *   active     → cancelled (by tenant request)
 *   active     → past_due (payment failure)
 *   past_due   → active (payment recovered) or expired (grace period lapsed)
 */
@Entity('subscriptions')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'isDeleted'])
@Index(['packageId'])
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK to package_definitions.id */
  @Column({ name: 'package_id', type: 'uuid', nullable: false })
  packageId!: string;

  /** Snapshot of package.tierKey at subscription time */
  @Column({ name: 'tier_key', type: 'varchar', length: 32, nullable: false })
  tierKey!: string;

  @Column({
    type: 'enum',
    enum: ['trialing', 'active', 'past_due', 'cancelled', 'expired', 'paused'],
    default: 'trialing',
  })
  status!: SubscriptionStatus;

  @Column({
    name: 'billing_cycle',
    type: 'enum',
    enum: ['monthly', 'annual', 'one_time', 'custom'],
    default: 'monthly',
  })
  billingCycle!: SubscriptionBillingCycle;

  /** Price paid in minor units — snapshot at subscription time */
  @Column({ name: 'price_minor_units', type: 'int', default: 0 })
  priceMinorUnits!: number;

  @Column({ type: 'varchar', length: 3, default: 'GBP' })
  currency!: string;

  /** Start of current billing period */
  @Column({ name: 'period_start', type: 'timestamptz', nullable: false })
  periodStart!: Date;

  /** End of current billing period — next renewal date */
  @Column({ name: 'period_end', type: 'timestamptz', nullable: false })
  periodEnd!: Date;

  /** When the trial ends (null if no trial) */
  @Column({ name: 'trial_end', type: 'timestamptz', nullable: true })
  trialEnd!: Date | null;

  /** When this subscription was cancelled */
  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  /** Reason for cancellation */
  @Column({ name: 'cancel_reason', type: 'varchar', length: 500, nullable: true })
  cancelReason!: string | null;

  /**
   * Feature flags snapshot — copied from package.features at subscribe time.
   * Ensures existing subscriptions are unaffected by package updates.
   */
  @Column({ name: 'features_snapshot', type: 'jsonb', nullable: false, default: '{}'  })
  featuresSnapshot!: Record<string, boolean>;

  /**
   * Resource limits snapshot — copied from package.limits at subscribe time.
   */
  @Column({ name: 'limits_snapshot', type: 'jsonb', nullable: false, default: '{}'  })
  limitsSnapshot!: Record<string, number>;

  /** External payment provider subscription ID (Stripe, etc.) — Sprint 3 */
  @Column({ name: 'external_sub_id', type: 'varchar', length: 255, nullable: true })
  externalSubId!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
