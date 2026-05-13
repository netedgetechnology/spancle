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
 * Blackout scope — what level of the hierarchy is blocked:
 *   tenant  → all courts for this tenant
 *   branch  → all courts in a specific branch
 *   court   → a single specific court
 *   sport   → all courts with this sport assigned
 */
export type BlackoutScope = 'tenant' | 'branch' | 'court' | 'sport';

/**
 * BlackoutEntity — a time window that prevents slot generation or booking.
 *
 * Two purposes:
 *   1. Block future slot generation (checked by SlotGeneratorService)
 *   2. Block booking on already-generated slots (checked by BookingService)
 *
 * Examples:
 *   - Christmas closure: scope=tenant, full day, Dec 25
 *   - Court maintenance: scope=court, specific datetime range
 *   - Branch refurbishment: scope=branch, full week
 *   - Tournament reservation: scope=sport, specific courts/dates
 *
 * Cancels existing 'available' slots:
 *   When isActive is set to true, SlotService optionally cancels
 *   all 'available' slots in the window (not 'booked' — those require
 *   manual intervention). Controlled by cancelExistingSlots flag.
 *
 * Table: blackouts
 */
@Entity('blackouts')
@Index(['tenantId', 'scope'])
@Index(['tenantId', 'startAt', 'endAt'])
@Index(['tenantId', 'branchId'])
@Index(['tenantId', 'courtId'])
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'isDeleted'])
export class BlackoutEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  // ── Scope ──────────────────────────────────────────────────────────────────

  @Column({
    type:    'enum',
    enum:    ['tenant', 'branch', 'court', 'sport'],
    default: 'tenant',
  })
  scope!: BlackoutScope;

  /** Set when scope = 'branch' */
  @Column({ name: 'branch_id', type: 'uuid', nullable: true })
  branchId!: string | null;

  /** Set when scope = 'court' */
  @Column({ name: 'court_id', type: 'uuid', nullable: true })
  courtId!: string | null;

  /** Set when scope = 'sport' */
  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId!: string | null;

  // ── Time window ────────────────────────────────────────────────────────────

  /** Start of the blackout window (inclusive, with timezone) */
  @Column({ name: 'start_at', type: 'timestamptz', nullable: false })
  startAt!: Date;

  /** End of the blackout window (exclusive) */
  @Column({ name: 'end_at', type: 'timestamptz', nullable: false })
  endAt!: Date;

  /**
   * If true, the blackout applies to the entire day(s) regardless of time.
   * When true, startAt/endAt times are ignored; only dates matter.
   */
  @Column({ name: 'all_day', type: 'boolean', default: false })
  allDay!: boolean;

  // ── Behaviour flags ────────────────────────────────────────────────────────

  /**
   * If true, cancels all 'available' slots within this window when the
   * blackout is created or activated. 'booked' slots are NOT cancelled
   * automatically — those require manual admin review.
   */
  @Column({ name: 'cancel_existing_slots', type: 'boolean', default: false })
  cancelExistingSlots!: boolean;

  /**
   * If true, new bookings cannot be made in this window even if slots
   * were not cancelled. Allows existing bookings to remain honoured.
   */
  @Column({ name: 'block_new_bookings', type: 'boolean', default: true })
  blockNewBookings!: boolean;

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
