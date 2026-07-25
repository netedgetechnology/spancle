import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export type WaitlistStatus =
  | 'waiting'      // active — waiting for a slot to open
  | 'promoted'     // slot reserved; customer has WAITLIST_RESERVATION_TTL_MINS to complete booking
  | 'expired'      // promotion window elapsed without booking
  | 'booked'       // customer completed the booking — terminal
  | 'cancelled';   // customer left the waitlist — terminal

/**
 * WaitlistEntryEntity
 *
 * One row per customer-slot waitlist position.
 *
 * Scope: entries are always scoped to a specific slotId (and its court/branch
 * for denormalization). When a slot is released, entries for that slotId are
 * processed in position order.
 *
 * Duplicate prevention: unique partial index on
 *   (tenantId, slotId, customerId/userId) WHERE status = 'waiting'
 * prevents the same customer from joining the same slot twice.
 *
 * Priority: position integer auto-assigned at join time. Lower = earlier.
 * Promotions always take the lowest active position first.
 *
 * Promotion TTL: configured via WAITLIST_RESERVATION_TTL_MINS (default 30).
 * A scheduler sweeps expired promotions and moves to the next candidate.
 *
 * Table: waitlist_entries
 */
@Entity('waitlist_entries')
@Index(['tenantId', 'slotId', 'status'])
@Index(['tenantId', 'slotId', 'position'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'customerId'])
@Index(['tenantId', 'status', 'promotedUntil'])
export class WaitlistEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'slot_id', type: 'uuid', nullable: false })
  slotId!: string;

  /** Denormalized for query performance — avoids joining slots table on every sweep. */
  @Column({ name: 'court_id', type: 'uuid', nullable: false })
  courtId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  /**
   * Identity-service user FK — non-null for registered customers.
   * Null for guest entries created via walk-in / admin.
   */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  /** FK to CustomerEntity — always set when customer domain is used. */
  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  /** Denormalized customer name for display without a JOIN. */
  @Column({ name: 'customer_name', type: 'varchar', length: 255, nullable: false })
  customerName!: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 254, nullable: true })
  customerEmail!: string | null;

  @Column({ name: 'customer_phone', type: 'varchar', length: 30, nullable: true })
  customerPhone!: string | null;

  /**
   * Priority position within the waitlist for this slot.
   * Assigned as MAX(position) + 1 at join time within the slot scope.
   * Lower = higher priority.
   */
  @Column({ type: 'int', nullable: false })
  position!: number;

  @Column({ type: 'varchar', length: 20, nullable: false, default: 'waiting' })
  status!: WaitlistStatus;

  /** Set when status transitions to 'promoted'. */
  @Column({ name: 'promoted_at', type: 'timestamptz', nullable: true })
  promotedAt!: Date | null;

  /**
   * Deadline for the promoted customer to complete the booking.
   * After this time the promotion expires and the next candidate is tried.
   */
  @Column({ name: 'promoted_until', type: 'timestamptz', nullable: true })
  promotedUntil!: Date | null;

  /** The booking created after a successful promotion (terminal confirmation). */
  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
