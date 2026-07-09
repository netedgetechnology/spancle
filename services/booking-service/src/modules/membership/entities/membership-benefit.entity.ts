import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * MembershipBenefitEntity — a single benefit line on a MembershipPlan.
 *
 * Stored separately from MembershipPlanEntity for normalisation.
 * At enrolment time, all active benefits for the plan are denormalised into
 * MembershipEntity.benefitSnapshot (JSONB) so plan changes do not alter
 * live memberships.
 *
 * benefitType is varchar (not enum) for forward-compatibility.
 * Valid benefitType values: booking_discount_pct | booking_discount_fixed |
 *   priority_booking_hours | guest_pass | coaching_credit | tournament_credit |
 *   merchandise_voucher | cafe_credit | court_booking_included | locker_access |
 *   towel_service | free_guest_coaching | academy_discount_pct
 *
 * Table: membership_plan_benefits
 */
@Entity('membership_plan_benefits')
@Index(['tenantId', 'planId'])
@Index(['tenantId', 'planId', 'benefitType'], {
  unique: true,
  where: '"is_deleted" = false',
})
export class MembershipBenefitEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * FK → membership_plans.id (same DB).
   * No DB-level FK — plans can be archived without cascading.
   */
  @Column({ name: 'plan_id', type: 'uuid', nullable: false })
  planId!: string;

  /** Benefit type identifier — varchar, see above for valid values. */
  @Column({ name: 'benefit_type', type: 'varchar', length: 80, nullable: false })
  benefitType!: string;

  /**
   * Units granted per period. null = unlimited.
   * For boolean benefits (locker_access, towel_service): set to 1, periodType = null.
   */
  @Column({ name: 'units_per_period', type: 'int', nullable: true })
  unitsPerPeriod!: number | null;

  /**
   * Period over which units are allocated.
   * null = one-off for the lifetime of the membership.
   * Values: week | month | quarter | year | membership_term
   */
  @Column({ name: 'period_type', type: 'varchar', length: 20, nullable: true })
  periodType!: string | null;

  /**
   * Which day of the period the balance resets.
   * For monthly: 1 = first of month. For weekly: 1 = Monday.
   */
  @Column({ name: 'reset_day', type: 'int', nullable: false, default: 1 })
  resetDay!: number;

  /** Whether unused units carry over to the next period. */
  @Column({ name: 'rollover_allowed', type: 'boolean', nullable: false, default: false })
  rolloverAllowed!: boolean;

  /** Maximum units to carry over. null = no cap (only meaningful if rolloverAllowed = true). */
  @Column({ name: 'max_rollover_units', type: 'int', nullable: true })
  maxRolloverUnits!: number | null;

  /** Whether units can be gifted to a guest rather than the member. */
  @Column({ name: 'transferable', type: 'boolean', nullable: false, default: false })
  transferable!: boolean;

  /** Whether unused units expire when the membership expires or is cancelled. */
  @Column({ name: 'expires_with_membership', type: 'boolean', nullable: false, default: true })
  expiresWithMembership!: boolean;

  @Column({ name: 'sort_order', type: 'int', nullable: false, default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_deleted', type: 'boolean', nullable: false, default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
