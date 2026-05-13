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
 * RecurrenceRule — defines which days of the week the template applies.
 * A template with all days false generates no slots.
 */
export interface RecurrenceRule {
  monday:    boolean;
  tuesday:   boolean;
  wednesday: boolean;
  thursday:  boolean;
  friday:    boolean;
  saturday:  boolean;
  sunday:    boolean;
}

/**
 * SlotTemplateEntity — a reusable schedule pattern for a court.
 *
 * A template defines WHEN to generate slots, not the slots themselves.
 * SlotGeneratorService.generateFromTemplate() reads the template and
 * creates SlotEntity rows for the requested date range.
 *
 * One template per court is typical, but a court can have multiple
 * templates for different season schedules (summer/winter hours).
 * Only one template should be active (isActive = true) per court at a time;
 * this is enforced at service layer, not DB level, for flexibility.
 *
 * Template fields:
 *   - courtId:          the court this schedule applies to
 *   - validFrom/Until:  date range the template is in effect
 *   - recurrence:       which days of the week to generate slots
 *   - openTime/closeTime: daily window within which slots are created
 *   - durationMins:     duration of each slot (e.g. 60 = 1-hour slots)
 *   - bufferMins:       gap between slots (e.g. 15 for cleaning time)
 *   - maxAdvanceDays:   how far ahead to pre-generate (default: 30)
 *   - autoPublish:      if true, generated slots start as 'available' immediately
 *
 * Table: slot_templates
 */
@Entity('slot_templates')
@Index(['tenantId', 'courtId'])
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'isDeleted'])
export class SlotTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK → courts.id (identity-service) */
  @Column({ name: 'court_id', type: 'uuid', nullable: false })
  courtId!: string;

  /** Denormalised for branch-level queries */
  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ── Validity window ────────────────────────────────────────────────────────

  /** Date from which this template is effective (date only — no time) */
  @Column({ name: 'valid_from', type: 'date', nullable: false })
  validFrom!: string;

  /** Date after which this template expires. Null = no end date */
  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil!: string | null;

  // ── Recurrence ─────────────────────────────────────────────────────────────

  /**
   * Which days of the week to generate slots.
   * Stored as JSONB RecurrenceRule object.
   */
  @Column({ type: 'jsonb', nullable: false })
  recurrence!: RecurrenceRule;

  // ── Daily schedule ─────────────────────────────────────────────────────────

  /**
   * Opening time for slot generation — HH:MM in 24-hour format.
   * If null, uses the court's operatingHours for the day.
   */
  @Column({ name: 'open_time', type: 'varchar', length: 5, nullable: true })
  openTime!: string | null;

  /**
   * Closing time for slot generation — HH:MM in 24-hour format.
   * If null, uses the court's operatingHours for the day.
   */
  @Column({ name: 'close_time', type: 'varchar', length: 5, nullable: true })
  closeTime!: string | null;

  // ── Slot configuration ─────────────────────────────────────────────────────

  /** Duration of each generated slot in minutes (e.g. 30, 60, 90) */
  @Column({ name: 'duration_mins', type: 'int', nullable: false })
  durationMins!: number;

  /**
   * Buffer gap between slots in minutes (e.g. 15 for changeover/cleaning).
   * Slots do not overlap during this gap — it is not a bookable period.
   */
  @Column({ name: 'buffer_mins', type: 'int', default: 0 })
  bufferMins!: number;

  /**
   * How many days ahead to pre-generate slots from today.
   * Scheduler runs daily and generates slots up to this horizon.
   */
  @Column({ name: 'max_advance_days', type: 'int', default: 30 })
  maxAdvanceDays!: number;

  /**
   * Maximum concurrent bookings per generated slot.
   * Overrides court.maxBookingsConcurrent for this template.
   * Null = use court default.
   */
  @Column({ name: 'max_bookings', type: 'int', nullable: true })
  maxBookings!: number | null;

  /**
   * If true, generated slots immediately have status = 'available'.
   * If false, slots start as 'unavailable' and must be published manually.
   */
  @Column({ name: 'auto_publish', type: 'boolean', default: true })
  autoPublish!: boolean;

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
