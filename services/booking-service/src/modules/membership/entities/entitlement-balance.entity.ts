import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * EntitlementBalanceEntity — tracks current remaining units per benefit per membership.
 *
 * One row per (membershipId, benefitType).  The balance is a derived value
 * maintained by EntitlementService; it can be reconstructed at any time
 * by replaying MembershipTransactionEntity rows, but is cached here for
 * O(1) availability checks.
 *
 * Mutations:
 *   - All writes MUST use a pessimistic FOR UPDATE lock to prevent
 *     concurrent over-consumption.
 *   - Every balance change creates a MembershipTransactionEntity row (ledger).
 *   - No soft-delete: when a membership expires/cancels, balances remain
 *     as a historical record (queried via isActive = false).
 *
 * reservedUnits: units locked by an in-flight reservation (e.g. a booking
 *   in progress) before confirmed consumption.  Effective available =
 *   balance - reservedUnits.
 *
 * Table: membership_entitlement_balances
 */
@Entity('membership_entitlement_balances')
@Index(['tenantId', 'membershipId'])
@Index(['tenantId', 'membershipId', 'benefitType'], { unique: true })
@Index(['tenantId', 'nextResetAt'], { where: '"next_reset_at" IS NOT NULL' })
export class EntitlementBalanceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * FK → memberships.id (same DB, no constraint — balance survives membership archive).
   */
  @Column({ name: 'membership_id', type: 'uuid', nullable: false })
  membershipId!: string;

  /**
   * Benefit type — varchar for forward-compatibility.
   * Values: court_credit | coaching_credit | guest_pass | tournament_credit |
   *         cafe_credit | merchandise_credit | locker_access | parking_access | custom:*
   */
  @Column({ name: 'benefit_type', type: 'varchar', length: 80, nullable: false })
  benefitType!: string;

  /**
   * Current remaining units available for consumption.
   * For boolean entitlements (locker_access, parking_access): 1 = active, 0 = inactive.
   * Never goes below 0 (enforced by EntitlementService before decrement).
   */
  @Column({ name: 'balance', type: 'int', nullable: false, default: 0 })
  balance!: number;

  /**
   * Units currently locked by in-flight reservations.
   * Effective available = balance - reservedUnits.
   * Released when a reservation is confirmed (consume) or abandoned (release).
   */
  @Column({ name: 'reserved_units', type: 'int', nullable: false, default: 0 })
  reservedUnits!: number;

  /** Units granted at the start of each reset period (snapshot from benefit definition). */
  @Column({ name: 'base_units', type: 'int', nullable: false, default: 0 })
  baseUnits!: number;

  /**
   * Period type drives the reset schedule.
   * Values: week | month | quarter | year | membership_term
   * null = non-resetting (one-off grant for the membership term).
   */
  @Column({ name: 'period_type', type: 'varchar', length: 20, nullable: true })
  periodType!: string | null;

  /**
   * When this balance next resets to baseUnits + rollover.
   * null for non-resetting entitlements.
   * Indexed — used by the nightly reset scheduler.
   */
  @Column({ name: 'next_reset_at', type: 'timestamptz', nullable: true })
  nextResetAt!: Date | null;

  /** When this balance was last reset. null if never reset. */
  @Column({ name: 'last_reset_at', type: 'timestamptz', nullable: true })
  lastResetAt!: Date | null;

  /** Whether unused units carry over to the next period. */
  @Column({ name: 'rollover_allowed', type: 'boolean', nullable: false, default: false })
  rolloverAllowed!: boolean;

  /** Maximum units to carry over. null = no cap. */
  @Column({ name: 'max_rollover_units', type: 'int', nullable: true })
  maxRolloverUnits!: number | null;

  /** Cumulative units consumed over the lifetime of this membership. */
  @Column({ name: 'total_consumed_lifetime', type: 'int', nullable: false, default: 0 })
  totalConsumedLifetime!: number;

  /** false when membership expires/cancels. Balances remain for historical queries. */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
