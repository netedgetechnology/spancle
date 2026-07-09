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
 * Rule type determines how the modifier is applied in the price pipeline.
 *
 * Core types:
 *   base        — replaces the base rate entirely (per-court custom rates)
 *   peak        — surcharge during peak time windows
 *   weekend     — surcharge on Saturday/Sunday
 *   holiday     — surcharge on public holidays
 *   member      — discount for member bookings
 *   custom      — catch-all time/date-specific adjustment
 *
 * Extended types (Batch 5):
 *   time_of_day — fine-grained time-window pricing (more specific than peak)
 *   day_of_week — per-day pricing (more expressive than weekend)
 *   seasonal    — date-range seasonal pricing (summer/winter rates)
 *   promotion   — limited-time promotional discount
 *   membership  — tiered membership pricing (e.g. Gold vs Silver)
 *   coach       — coach-session pricing (per-hour, per-session)
 *   tournament  — tournament block pricing
 *   coupon      — coupon-code driven discount (validated against couponCode field)
 */
export type PricingRuleType =
  | 'base'
  | 'peak'
  | 'weekend'
  | 'holiday'
  | 'member'
  | 'custom'
  | 'time_of_day'
  | 'day_of_week'
  | 'seasonal'
  | 'promotion'
  | 'membership'
  | 'coach'
  | 'tournament'
  | 'coupon';

/**
 * Modifier types:
 *   percentage — modifierValue is a percentage (e.g. 25 = +25%)
 *   fixed      — modifierValue is an amount in minor currency units (e.g. 500 = £5.00)
 *   absolute   — modifierValue replaces the total price entirely
 */
export type ModifierType = 'percentage' | 'fixed' | 'absolute';

/**
 * Rule scope — defines what resource the rule applies to.
 * More specific scopes take precedence at the same priority.
 *
 *   tenant  → applies to all bookings for this tenant
 *   branch  → applies to all courts in a branch
 *   venue   → applies to all courts in a venue (booking-service venue)
 *   sport   → applies to all courts for a sport
 *   court   → applies to a specific court only
 */
export type PricingRuleScope = 'tenant' | 'branch' | 'venue' | 'sport' | 'court';

/**
 * PricingRuleEntity — a price modifier rule.
 *
 * Rules are evaluated by PricingService in a waterfall:
 *
 *   1. All rules matching scope, date, time, day-of-week are collected
 *   2. Sorted by priority DESC (higher = evaluated first)
 *   3. Applied in order by ruleType (base → peak/weekend/holiday → member)
 *   4. Custom rules with absolute modifierType set the final price directly
 *
 * A court's effective price =
 *   base_rate × (1 + Σ percentage modifiers) + Σ fixed modifiers
 *   rounded to nearest integer (pence)
 *
 * Table: pricing_rules
 */
@Entity('pricing_rules')
@Index(['tenantId', 'ruleType'])
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'branchId'])
@Index(['tenantId', 'venueId'])
@Index(['tenantId', 'courtId'])
@Index(['tenantId', 'sportId'])
@Index(['tenantId', 'couponCode'])
@Index(['tenantId', 'membershipTier'])
@Index(['tenantId', 'isDeleted'])
export class PricingRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ── Rule classification ────────────────────────────────────────────────────

  @Column({
    name:    'rule_type',
    type:    'enum',
    enum:    [
      'base', 'peak', 'weekend', 'holiday', 'member', 'custom',
      'time_of_day', 'day_of_week', 'seasonal', 'promotion',
      'membership', 'coach', 'tournament', 'coupon',
    ],
  })
  ruleType!: PricingRuleType;

  @Column({
    name:    'modifier_type',
    type:    'enum',
    enum:    ['percentage', 'fixed', 'absolute'],
    default: 'percentage',
  })
  modifierType!: ModifierType;

  /**
   * The modifier value:
   *   - percentage: 25 = +25%, -10 = -10%
   *   - fixed:      500 = +£5.00 in minor units
   *   - absolute:   3500 = price is exactly £35.00
   */
  @Column({ name: 'modifier_value', type: 'int', nullable: false })
  modifierValue!: number;

  // ── Scope ──────────────────────────────────────────────────────────────────

  @Column({
    type:    'enum',
    enum:    ['tenant', 'branch', 'venue', 'sport', 'court'],
    default: 'tenant',
  })
  scope!: PricingRuleScope;

  /** Populated when scope = 'branch' */
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  /** Populated when scope = 'venue' */
  @Column({ name: 'venue_id', type: 'uuid', nullable: true })
  venueId!: string | null;

  /** Populated when scope = 'sport' */
  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId!: string | null;

  /** Populated when scope = 'court' */
  @Column({ name: 'court_id', type: 'uuid', nullable: true })
  courtId!: string | null;

  // ── Coupon fields (ruleType = 'coupon') ───────────────────────────────────

  /**
   * Required when ruleType = 'coupon'.
   * Case-insensitive comparison at service layer.
   * Stored normalised (UPPER-CASED) at creation time.
   */
  @Column({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true })
  couponCode!: string | null;

  /**
   * Membership tier filter — when set, the 'member' / 'membership' rule only fires
   * when SlotPricingContext.membershipTier matches this slug exactly.
   * null = applies to all tiers.
   * Values match MembershipPlan.slug (e.g. 'gold', 'platinum').
   */
  @Column({ name: 'membership_tier', type: 'varchar', length: 50, nullable: true })
  membershipTier!: string | null;

  /**
   * Maximum number of times this coupon can be redeemed across all bookings.
   * Null = unlimited uses.
   */
  @Column({ name: 'max_redemptions', type: 'int', nullable: true })
  maxRedemptions!: number | null;

  /**
   * Number of times this coupon has been successfully redeemed.
   * Incremented atomically during booking creation. Read-only outside of PricingService.
   */
  @Column({ name: 'redemption_count', type: 'int', nullable: false, default: 0 })
  redemptionCount!: number;

  // ── Date applicability ─────────────────────────────────────────────────────

  /** Date from which this rule is active (inclusive, date only). Null = always. */
  @Column({ name: 'valid_from', type: 'date', nullable: true })
  validFrom!: string | null;

  /** Date after which this rule expires (inclusive). Null = no end. */
  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: string | null;

  // ── Day of week filter ─────────────────────────────────────────────────────

  /**
   * Which days of the week this rule applies to.
   * Empty array or null = applies to all days.
   * e.g. ['saturday', 'sunday'] for a weekend surcharge.
   */
  @Column({ name: 'days_of_week', type: 'jsonb', nullable: true })
  daysOfWeek!: string[] | null;

  // ── Time window filter ─────────────────────────────────────────────────────

  /**
   * Rule only applies during this time window.
   * HH:MM format. Null = applies all day.
   * e.g. peakStartTime='17:00' peakEndTime='21:00' for evening peak.
   */
  @Column({ name: 'time_start', type: 'varchar', length: 5, nullable: true })
  timeStart!: string | null;

  @Column({ name: 'time_end', type: 'varchar', length: 5, nullable: true })
  timeEnd!: string | null;

  // ── Priority ───────────────────────────────────────────────────────────────

  /**
   * Priority for conflict resolution.
   * Higher value = evaluated first. When two rules of the same type
   * and scope overlap, the higher-priority rule wins.
   * Default 0 (base priority). Admins can set 1–100 for overrides.
   */
  @Column({ type: 'int', default: 0 })
  priority!: number;

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
