import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// ── Status ────────────────────────────────────────────────────────────────────

/**
 * Branch lifecycle:
 *   active    — fully operational, accepts bookings
 *   inactive  — temporarily closed (e.g. refurbishment), no new bookings
 *   suspended — suspended by admin (e.g. compliance issue)
 *   archived  — permanently closed, historical record only
 */
export type BranchStatus = 'active' | 'inactive' | 'suspended' | 'archived';

// ── Timings ───────────────────────────────────────────────────────────────────

/**
 * DayTiming — opening hours for a single day.
 * `isClosed: true` marks a day off regardless of time values.
 * Times stored as HH:MM strings in 24-hour format (e.g. "09:00", "21:30").
 */
export interface DayTiming {
  isClosed:  boolean;
  openTime:  string;   // HH:MM
  closeTime: string;   // HH:MM
}

/**
 * WeeklyTimings — 7-day schedule keyed by lowercase day name.
 * All 7 keys are always present. Missing days default to closed in the service.
 */
export interface WeeklyTimings {
  monday:    DayTiming;
  tuesday:   DayTiming;
  wednesday: DayTiming;
  thursday:  DayTiming;
  friday:    DayTiming;
  saturday:  DayTiming;
  sunday:    DayTiming;
}

// ── Entity ────────────────────────────────────────────────────────────────────

/**
 * BranchEntity — a physical location / branch of a tenant's organisation.
 *
 * Tenant isolation: every row carries tenantId, enforced by repository layer.
 *
 * Geo: latitude + longitude stored as DECIMAL(10,7) — sufficient precision
 * for ~1cm accuracy. Indexed for future geospatial queries.
 *
 * Timings: stored as JSONB WeeklyTimings object — 7-day schedule.
 * Validated at service layer before persist.
 *
 * Manager: optional FK to users.id (same tenant). Validated at service layer.
 *
 * Slug: URL-safe identifier, unique per tenant. Used in public-facing URLs.
 */
@Entity('branches')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'isDeleted'])
export class BranchEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tenant isolation */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Display name — e.g. "Acme FC — Manchester" */
  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  /** URL-safe slug — unique per tenant */
  @Column({ type: 'varchar', length: 100, nullable: false })
  slug!: string;

  /** Short description */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  // ── Address ────────────────────────────────────────────────────────────────

  @Column({ name: 'address_line1', type: 'varchar', length: 255, nullable: false })
  addressLine1!: string;

  @Column({ name: 'address_line2', type: 'varchar', length: 255, nullable: true })
  addressLine2!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: false })
  city!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  county!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: false })
  postcode!: string;

  /** ISO 3166-1 alpha-2 country code — e.g. 'GB', 'US', 'AE' */
  @Column({ type: 'varchar', length: 2, nullable: false, default: 'GB' })
  countryCode!: string;

  // ── Geo location ───────────────────────────────────────────────────────────

  /**
   * WGS-84 latitude — range -90.0 to +90.0
   * Precision 7 decimal places ≈ 1cm accuracy.
   */
  @Column({
    type:      'decimal',
    precision: 10,
    scale:     7,
    nullable:  true,
    transformer: {
      to:   (v: number | null) => v,
      from: (v: string | null) => v !== null ? parseFloat(v) : null,
    },
  })
  latitude!: number | null;

  /**
   * WGS-84 longitude — range -180.0 to +180.0
   */
  @Column({
    type:      'decimal',
    precision: 10,
    scale:     7,
    nullable:  true,
    transformer: {
      to:   (v: number | null) => v,
      from: (v: string | null) => v !== null ? parseFloat(v) : null,
    },
  })
  longitude!: number | null;

  /** Human-readable plus code or what3words address */
  @Column({ name: 'geo_label', type: 'varchar', length: 255, nullable: true })
  geoLabel!: string | null;

  // ── Contact ────────────────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone!: string | null;

  @Column({ type: 'varchar', length: 254, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  website!: string | null;

  // ── Manager ────────────────────────────────────────────────────────────────

  /**
   * FK → users.id (same tenant).
   * NOT a database-level FK constraint (cross-table without FK in multi-tenant
   * pattern — enforced at service layer by UserRepository lookup).
   */
  @Column({ name: 'manager_user_id', type: 'uuid', nullable: true })
  managerUserId!: string | null;

  // ── Status + timings ───────────────────────────────────────────────────────

  @Column({
    type:    'enum',
    enum:    ['active', 'inactive', 'suspended', 'archived'],
    default: 'active',
  })
  status!: BranchStatus;

  /**
   * JSONB 7-day weekly schedule.
   * Default: open Mon–Fri 09:00–17:00, closed Sat–Sun.
   */
  @Column({
    type:    'jsonb',
    nullable: false,
    default: () => `'${JSON.stringify({
      monday:    { isClosed: false, openTime: '09:00', closeTime: '17:00' },
      tuesday:   { isClosed: false, openTime: '09:00', closeTime: '17:00' },
      wednesday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
      thursday:  { isClosed: false, openTime: '09:00', closeTime: '17:00' },
      friday:    { isClosed: false, openTime: '09:00', closeTime: '17:00' },
      saturday:  { isClosed: true,  openTime: '09:00', closeTime: '17:00' },
      sunday:    { isClosed: true,  openTime: '09:00', closeTime: '17:00' },
    })}'`,
  })
  timings!: WeeklyTimings;

  /** External map pin URL or embed link */
  @Column({ name: 'map_url', type: 'varchar', length: 2048, nullable: true })
  mapUrl!: string | null;

  /** Facility tags — e.g. ['parking', 'changing_rooms', 'cafe'] */
  @Column({ type: 'jsonb', nullable: true })
  facilities!: string[] | null;

  /** Branch cover image URL */
  @Column({ name: 'image_url', type: 'varchar', length: 2048, nullable: true })
  imageUrl!: string | null;

  /** Sort order for display */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
