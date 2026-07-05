import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type CourtSurface =
  | 'grass'
  | 'artificial_grass'
  | 'hard_court'
  | 'clay'
  | 'carpet'
  | 'wood'
  | 'rubber'
  | 'sand'
  | 'other';

export type IndoorOutdoor = 'indoor' | 'outdoor';

/**
 * CourtEntity — a bookable court within a Venue.
 *
 * Belongs to exactly one Venue (venueId, non-nullable).
 * Belongs to a Branch via branchId (cross-service ref to identity-service).
 * Tenant isolation enforced at repository layer (tenantId on every query).
 *
 * Uniqueness constraints:
 *   UNIQUE (tenantId, venueId, courtNumber)  — no two courts in a venue share a number
 *   UNIQUE (tenantId, venueId, name)          — no two courts in a venue share a name
 *
 * Soft delete only: isDeleted + deletedAt. Hard deletes are prohibited.
 *
 * Table: courts_booking
 * (Named courts_booking to avoid collision with identity-service courts table
 *  on deployments that share a single PostgreSQL instance.)
 */
@Entity('courts_booking')
@Index(['tenantId', 'venueId'])
@Index(['tenantId', 'venueId', 'courtNumber'], { unique: true, where: '"is_deleted" = false AND "court_number" IS NOT NULL' })
@Index(['tenantId', 'venueId', 'name'], { unique: true, where: '"is_deleted" = false' })
@Index(['tenantId', 'isDeleted'])
@Index(['tenantId', 'isBookable'])
export class CourtEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tenant isolation — scopes every query */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK → venues.id (booking-service, same DB) — validated at service layer */
  @Column({ name: 'venue_id', type: 'uuid', nullable: false })
  venueId!: string;

  /**
   * FK → branches.id (identity-service).
   * Cross-service reference — no DB FK constraint.
   * Validated at service layer via identity-service API call.
   */
  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  /** Display name — unique per venue (enforced by partial unique index) */
  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  /**
   * Numeric identifier within the venue.
   * Unique per venue when set (enforced by partial unique index).
   * Null = not yet assigned a number (custom-named courts).
   */
  @Column({ name: 'court_number', type: 'int', nullable: true })
  courtNumber!: number | null;

  /**
   * FK → sports.id (identity-service).
   * Cross-service reference — no DB FK constraint.
   * Null = multi-sport court (sport resolved at booking time).
   */
  @Column({ name: 'sport_id', type: 'uuid', nullable: true })
  sportId!: string | null;

  /** Base hourly price in minor currency units (e.g. pence, cents) */
  @Column({ name: 'hourly_price', type: 'int', nullable: true })
  hourlyPrice!: number | null;

  /** ISO-4217 currency code — e.g. 'GBP', 'USD', 'INR' */
  @Column({ type: 'varchar', length: 3, nullable: false, default: 'GBP' })
  currency!: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  surface!: CourtSurface | null;

  @Column({
    name: 'indoor_outdoor',
    type: 'varchar',
    length: 10,
    nullable: false,
    default: 'indoor',
  })
  indoorOutdoor!: IndoorOutdoor;

  /** Width in metres */
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  width!: number | null;

  /** Length in metres */
  @Column({ type: 'decimal', precision: 6, scale: 2, nullable: true })
  length!: number | null;

  /** Maximum player/participant capacity */
  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  /** Default slot duration in minutes */
  @Column({ name: 'slot_duration', type: 'int', nullable: false, default: 60 })
  slotDuration!: number;

  /** Buffer before each slot in minutes (setup time) */
  @Column({ name: 'buffer_before', type: 'int', nullable: false, default: 0 })
  bufferBefore!: number;

  /** Buffer after each slot in minutes (cleanup time) */
  @Column({ name: 'buffer_after', type: 'int', nullable: false, default: 0 })
  bufferAfter!: number;

  /** Sort order for display within a venue */
  @Column({ name: 'display_order', type: 'int', nullable: false, default: 0 })
  displayOrder!: number;

  /** Whether the court accepts new bookings */
  @Column({ name: 'is_bookable', type: 'boolean', nullable: false, default: true })
  isBookable!: boolean;

  /** Whether the court is active (visible in UI and APIs) */
  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive!: boolean;

  @Column({ name: 'is_deleted', type: 'boolean', nullable: false, default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
