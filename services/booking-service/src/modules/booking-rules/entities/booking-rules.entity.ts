import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * BookingRulesEntity
 *
 * Defines operational constraints for when and how bookings can be made,
 * modified, or cancelled. Rules are scoped from broad to narrow:
 *
 *   tenant → branch → sport → court
 *
 * Resolution: the most-specific scope that has a rule wins.
 * When a value is null the rule is not enforced for that field.
 *
 * All monetary values: integer minor units (pence/cents).
 * All time windows: integer minutes (consistent with SlotEntity).
 * All counts: integer per the stated period.
 */
export const BOOKING_RULE_SCOPES = ['tenant', 'branch', 'sport', 'court'] as const;
export type  BookingRuleScope    = typeof BOOKING_RULE_SCOPES[number];

@Entity('booking_rules')
@Index(['tenantId'])
@Index(['tenantId', 'scope'])
@Index(['tenantId', 'scope', 'branchId', 'sportId', 'courtId'], { unique: true })
export class BookingRulesEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Tenant + scope ───────────────────────────────────────────────────────

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Which scope these rules apply to. */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'tenant' })
  scope!: BookingRuleScope;

  /**
   * Scope-specific foreign keys — only the key matching `scope` is populated.
   * e.g. scope='branch' → branchId set, sportId/courtId null.
   */
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId!: string | null;

  @Column({ name: 'court_id', type: 'uuid', nullable: true })
  courtId!: string | null;

  /** Human-readable name for this rule set (e.g. "Peak Hour Rules"). */
  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** Whether these rules are currently active. */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // ── Advance booking window ───────────────────────────────────────────────

  /**
   * Maximum minutes in advance a booking can be created.
   * e.g. 10080 = 7 days. null = no limit.
   */
  @Column({ name: 'max_advance_booking_mins', type: 'int', nullable: true })
  maxAdvanceBookingMins!: number | null;

  /**
   * Minimum minutes of notice required before the slot starts.
   * e.g. 60 = must book at least 1 hour before. null = no limit.
   */
  @Column({ name: 'min_notice_mins', type: 'int', nullable: true })
  minNoticeMins!: number | null;

  // ── Booking duration ─────────────────────────────────────────────────────

  /** Minimum total booking duration in minutes. null = no minimum. */
  @Column({ name: 'min_duration_mins', type: 'int', nullable: true })
  minDurationMins!: number | null;

  /** Maximum total booking duration in minutes. null = no maximum. */
  @Column({ name: 'max_duration_mins', type: 'int', nullable: true })
  maxDurationMins!: number | null;

  // ── Booking limits per customer ──────────────────────────────────────────

  /**
   * Maximum number of confirmed bookings a single customer may hold
   * simultaneously per day / week / month. null = no limit.
   */
  @Column({ name: 'max_bookings_per_day', type: 'int', nullable: true })
  maxBookingsPerDay!: number | null;

  @Column({ name: 'max_bookings_per_week', type: 'int', nullable: true })
  maxBookingsPerWeek!: number | null;

  @Column({ name: 'max_bookings_per_month', type: 'int', nullable: true })
  maxBookingsPerMonth!: number | null;

  // ── Member / age restrictions ────────────────────────────────────────────

  /**
   * When true, only customers with isMember=true can book.
   * Online channels enforce this; walk_in and admin channels bypass it.
   */
  @Column({ name: 'members_only', type: 'boolean', default: false })
  membersOnly!: boolean;

  /** Minimum age in years. null = no restriction. */
  @Column({ name: 'min_age_years', type: 'int', nullable: true })
  minAgeYears!: number | null;

  /** Maximum age in years. null = no restriction. */
  @Column({ name: 'max_age_years', type: 'int', nullable: true })
  maxAgeYears!: number | null;

  // ── Buffer time ──────────────────────────────────────────────────────────

  /**
   * Required gap in minutes between two consecutive bookings on the same court.
   * Enforced when checking slot availability. null = no buffer required.
   */
  @Column({ name: 'buffer_time_mins', type: 'int', nullable: true })
  bufferTimeMins!: number | null;

  // ── Cancellation & reschedule cutoffs ────────────────────────────────────

  /**
   * Minutes before the booking start after which cancellation is no longer
   * allowed by the customer. Admins can always cancel.
   * null = no cutoff (can cancel any time).
   */
  @Column({ name: 'cancellation_cutoff_mins', type: 'int', nullable: true })
  cancellationCutoffMins!: number | null;

  /**
   * Minutes before the booking start after which rescheduling is no longer
   * allowed. null = no cutoff.
   */
  @Column({ name: 'reschedule_cutoff_mins', type: 'int', nullable: true })
  rescheduleCutoffMins!: number | null;

  /**
   * Grace period in minutes after the booking start during which
   * a no-show can still check in and be accepted. null = no grace period.
   */
  @Column({ name: 'grace_period_mins', type: 'int', nullable: true })
  gracePeriodMins!: number | null;

  // ── Blackout dates ───────────────────────────────────────────────────────

  /**
   * ISO date strings on which new bookings are blocked, stored as jsonb.
   * Format: ["2025-12-25", "2025-01-01"].
   * Complements BlackoutEntity (which blocks slot availability);
   * these block booking creation independent of slot status.
   */
  @Column({ name: 'blackout_dates', type: 'jsonb', nullable: true, default: '[]' })
  blackoutDates!: string[] | null;

  // ── Timestamps ───────────────────────────────────────────────────────────

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
