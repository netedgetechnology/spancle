import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { WeeklyTimings } from '../../../modules/branch/entities/branch.entity';

// ── Status ────────────────────────────────────────────────────────────────────

/**
 * Court operational status lifecycle:
 *   available    — open and bookable
 *   unavailable  — temporarily closed / not accepting bookings
 *   maintenance  — under maintenance; surfaced to admins with a warning
 *   retired      — permanently decommissioned; historical record only
 */
export type CourtStatus = 'available' | 'unavailable' | 'maintenance' | 'retired';

// ── Surface types ─────────────────────────────────────────────────────────────

export type SurfaceType =
  | 'grass'
  | 'artificial_grass'
  | 'hard_court'
  | 'clay'
  | 'carpet'
  | 'wood'
  | 'rubber'
  | 'sand'
  | 'water'   // water polo
  | 'ice'
  | 'other';

// ── Court type ────────────────────────────────────────────────────────────────

export type CourtType = 'indoor' | 'outdoor';

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * CourtEntity — a bookable court / pitch / lane / pool within a branch.
 *
 * Design decisions:
 *
 *   - A court MUST belong to a branch (branchId non-nullable).
 *   - A court MAY be linked to a primary sport (sportId nullable).
 *     Multi-sport courts leave sportId null; the booking layer handles
 *     sport selection at booking time.
 *
 *   - `operatingHours`: court-specific schedule (JSONB, WeeklyTimings shape).
 *     Defaults to null — when null, the parent branch operating hours apply.
 *     When set, court hours override branch hours for this court specifically.
 *
 *   - `maintenanceNote`: free-text reason visible to admins when status = maintenance.
 *
 *   - Unique: (tenant_id, branch_id, name) — no two courts in the same branch
 *     share a name. Enforced at DB level + service layer.
 *
 *   - `courtNumber`: optional numeric identifier used for bulk-generated courts
 *     (e.g. Court 1, Court 2…). Stored separately so sorting is numeric, not lexical.
 *
 * Table: `courts`
 */
@Entity('courts')
@Index(['tenantId', 'branchId', 'name'], { unique: true })
@Index(['tenantId', 'branchId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'sportId'])
@Index(['tenantId', 'isDeleted'])
export class CourtEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK → branches.id (same tenant) — enforced at service layer */
  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  /**
   * Optional FK → sports.id (same tenant).
   * Null = multi-sport / sport selected at booking time.
   */
  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId!: string | null;

  /** Display name — unique per branch. e.g. "Court 1", "Centre Court", "Pool A" */
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  /** Optional short code for display in calendars — e.g. "C1", "CC" */
  @Column({ type: 'varchar', length: 20, nullable: true })
  code!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ── Physical attributes ────────────────────────────────────────────────────

  @Column({
    type:    'enum',
    enum:    ['indoor', 'outdoor'],
    default: 'indoor',
  })
  courtType!: CourtType;

  @Column({
    name:    'surface_type',
    type:    'enum',
    enum:    ['grass', 'artificial_grass', 'hard_court', 'clay', 'carpet', 'wood', 'rubber', 'sand', 'water', 'ice', 'other'],
    default: 'hard_court',
  })
  surfaceType!: SurfaceType;

  /** Maximum number of concurrent players/participants on this court */
  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  /** Maximum number of simultaneous bookings (usually 1, or 2 for shared lanes) */
  @Column({ name: 'max_bookings_concurrent', type: 'int', default: 1 })
  maxBookingsConcurrent!: number;

  /** Court dimensions in metres — e.g. "68m × 105m" */
  @Column({ type: 'varchar', length: 50, nullable: true })
  dimensions!: string | null;

  // ── Status ─────────────────────────────────────────────────────────────────

  @Column({
    type:    'enum',
    enum:    ['available', 'unavailable', 'maintenance', 'retired'],
    default: 'available',
  })
  status!: CourtStatus;

  /**
   * Free-text maintenance reason — shown to admins when status = maintenance.
   * Cleared automatically when status transitions away from maintenance.
   */
  @Column({ name: 'maintenance_note', type: 'varchar', length: 1000, nullable: true })
  maintenanceNote!: string | null;

  /** When the court was placed into maintenance */
  @Column({ name: 'maintenance_started_at', type: 'timestamptz', nullable: true })
  maintenanceStartedAt!: Date | null;

  /** Expected maintenance completion date */
  @Column({ name: 'maintenance_expected_end', type: 'timestamptz', nullable: true })
  maintenanceExpectedEnd!: Date | null;

  // ── Operating hours ────────────────────────────────────────────────────────

  /**
   * Court-specific operating hours (WeeklyTimings JSONB).
   * Null = inherit from parent branch.
   * Set = these hours override branch hours for this specific court.
   */
  @Column({
    name:     'operating_hours',
    type:     'jsonb',
    nullable: true,
  })
  operatingHours!: WeeklyTimings | null;

  // ── Display / booking ──────────────────────────────────────────────────────

  /** Numeric sort key — used for bulk-generated courts (Court 1, 2, 3…) */
  @Column({ name: 'court_number', type: 'int', nullable: true })
  courtNumber!: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  /** Cover image URL for display in booking interfaces */
  @Column({ name: 'image_url', type: 'varchar', length: 2048, nullable: true })
  imageUrl!: string | null;

  /** Amenity tags — e.g. ['floodlights', 'changing_rooms', 'parking'] */
  @Column({ type: 'jsonb', nullable: true })
  amenities!: string[] | null;

  /** Hourly rate in minor currency units (pence/cents). Null = use branch default */
  @Column({ name: 'hourly_rate_minor', type: 'int', nullable: true })
  hourlyRateMinor!: number | null;

  /**
   * Rate Card assignment — FK → rate_cards.id in booking-service.
   * Not a DB-level FK (cross-service boundary). Validated at application layer
   * by calling booking-service before persisting.
   * When set, the Rate Card drives base pricing instead of hourlyRateMinor.
   * Null = no Rate Card assigned; hourlyRateMinor is used as flat base rate.
   */
  @Column({ name: 'rate_card_id', type: 'uuid', nullable: true })
  rateCardId!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
