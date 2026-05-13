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
 * Slot lifecycle state machine:
 *
 *   available  →  reserved   (admin hold or checkout session opened)
 *       ↓             ↓
 *    booked  ←   reserved   (payment confirmed)
 *       ↓
 *   cancelled              (customer/admin cancellation — slot freed)
 *       ↓
 *   completed              (session window has passed — terminal)
 *
 * State transitions enforced in SlotService.updateStatus().
 */
export type SlotStatus =
  | 'available'
  | 'reserved'
  | 'booked'
  | 'cancelled'
  | 'completed'
  | 'unavailable';

/**
 * SlotEntity — a concrete, bookable time block on a specific court.
 *
 * Architecture decisions:
 *
 *   - Slots are stored as rows (not generated on-the-fly). This enables
 *     booking FKs, pricing snapshots, overlap DB constraints, and
 *     efficient calendar range queries.
 *
 *   - courtId is a plain UUID — no DB-level FK to courts table (which
 *     lives in identity-service, a separate DB). Referential integrity
 *     enforced at service layer via HTTP call to identity-service.
 *
 *   - resolvedPriceMinor is computed at generation time by PricingService
 *     and stored. Avoids re-computing on every availability query.
 *     Historical accuracy: price doesn't change after slot is booked.
 *
 *   - priceOverrideMinor: admin-set per-slot manual price. Always wins
 *     over resolvedPriceMinor when set. Used for promotional pricing
 *     or corrections without touching pricing rules.
 *
 *   - templateId: optional link to the SlotTemplateEntity that generated
 *     this slot. Manual (one-off) slots have templateId = null.
 *
 *   - bookingId: set when status transitions to 'booked'. The booking
 *     record lives in the bookings table (same service DB).
 *
 *   - reservedUntil: expiry timestamp for 'reserved' status. A scheduler
 *     in SlotGeneratorService auto-expires stale reservations.
 *
 * DB uniqueness: UNIQUE(tenant_id, court_id, start_at) WHERE
 *   is_deleted = false AND status != 'cancelled'
 *   This is the primary overlap prevention constraint.
 *
 * Table: slots
 */
@Entity('slots')
@Index(['tenantId', 'courtId', 'startAt'], { unique: false }) // overlap query index
@Index(['tenantId', 'courtId', 'status'])
@Index(['tenantId', 'startAt', 'endAt'])                      // calendar range queries
@Index(['tenantId', 'branchId'])
@Index(['tenantId', 'sportId'])
@Index(['tenantId', 'isDeleted'])
export class SlotEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ── Tenant isolation ───────────────────────────────────────────────────────

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  // ── Cross-service references (UUIDs, no DB FK) ─────────────────────────────

  /** FK → courts.id (identity-service) — validated at creation via HTTP */
  @Column({ name: 'court_id', type: 'uuid', nullable: false })
  courtId!: string;

  /** Denormalised from court for efficient branch-level queries */
  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  /** Denormalised from court (nullable — multi-sport courts) */
  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId!: string | null;

  /** FK → slot_templates.id — null for manually created slots */
  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId!: string | null;

  /** FK → bookings.id — set when status transitions to 'booked' */
  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  // ── Timing ─────────────────────────────────────────────────────────────────

  @Column({ name: 'start_at', type: 'timestamptz', nullable: false })
  startAt!: Date;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: false })
  endAt!: Date;

  /** Duration in minutes — denormalised from (endAt - startAt) for query convenience */
  @Column({ name: 'duration_mins', type: 'int', nullable: false })
  durationMins!: number;

  // ── Status ─────────────────────────────────────────────────────────────────

  @Column({
    type:    'enum',
    enum: ['available', 'reserved', 'booked', 'cancelled', 'completed', 'unavailable'],
    default: 'available',
  })
  status!: SlotStatus;

  /** Expiry for 'reserved' status — null for all other statuses */
  @Column({ name: 'reserved_until', type: 'timestamptz', nullable: true })
  reservedUntil!: Date | null;

  // ── Pricing ────────────────────────────────────────────────────────────────

  /**
   * Price resolved at generation time by PricingService.
   * Represents the effective price after all pricing rules applied.
   * Minor currency units (pence/cents). Null = free.
   */
  @Column({ name: 'resolved_price_minor', type: 'int', nullable: true })
  resolvedPriceMinor!: number | null;

  /**
   * Manual per-slot price override — set by admin.
   * When non-null, this ALWAYS wins over resolvedPriceMinor.
   * Used for promotions or corrections without touching pricing rules.
   */
  @Column({ name: 'price_override_minor', type: 'int', nullable: true })
  priceOverrideMinor!: number | null;

  /** ISO-4217 currency — inherited from tenant/branch at generation */
  @Column({ type: 'varchar', length: 3, default: 'GBP' })
  currency!: string;

  /**
   * Snapshot of the pricing rule IDs that contributed to resolvedPriceMinor.
   * Stored for audit — price justification without re-running the pipeline.
   */
  @Column({ name: 'applied_rule_ids', type: 'jsonb', nullable: true })
  appliedRuleIds!: string[] | null;

  // ── Metadata ───────────────────────────────────────────────────────────────

  /**
   * Human-readable label for the slot (auto-generated or admin-set).
   * e.g. "Court 1 — Monday 09:00–10:00"
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  /** Optional notes visible to booking admin */
  @Column({ type: 'varchar', length: 1000, nullable: true })
  notes!: string | null;

  /**
   * Maximum number of bookings this slot can carry simultaneously.
   * Default 1 (exclusive booking). >1 for shared sessions (e.g. lane swimming).
   * Mirrors court.maxBookingsConcurrent but can be overridden per slot.
   */
  @Column({ name: 'max_bookings', type: 'int', default: 1 })
  maxBookings!: number;

  /** How many bookings currently active on this slot */
  @Column({ name: 'current_bookings', type: 'int', default: 0 })
  currentBookings!: number;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
