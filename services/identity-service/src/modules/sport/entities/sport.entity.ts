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
 * Sport status:
 *   active   — visible and bookable across assigned branches
 *   inactive — hidden from public booking; admin-visible only
 */
export type SportStatus = 'active' | 'inactive';

/**
 * SportEntity — a sport or activity offered by a tenant.
 *
 * Design decisions:
 *   - No hard limit on sports per tenant (requirement: unlimited).
 *     Plan-based limits enforced separately in Sprint 3 via PlanLimitGuard.
 *
 *   - `config` JSONB: sport-specific configuration (e.g. team sizes,
 *     duration presets, scoring rules, equipment checklist).
 *     Intentionally untyped at entity level — validated in service layer.
 *     Sprint 3: add sportType enum + per-type JSON Schema validation.
 *
 *   - `icon`: emoji or icon identifier string (e.g. "⚽", "football",
 *     "mdi:soccer"). Kept as a free-form string for flexibility.
 *
 *   - `color`: hex colour string (e.g. "#3b82f6") for UI differentiation.
 *
 *   - Branch mapping is handled by SportBranchEntity (separate join table).
 *     A sport with no branch mappings is available at all branches (global).
 *     A sport with mappings is available only at those branches.
 *
 * Table: `sports`
 * Unique: (tenant_id, slug)
 */
@Entity('sports')
@Index(['tenantId', 'slug'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'isDeleted'])
export class SportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name!: string;

  /**
   * URL-safe slug — unique per tenant.
   * e.g. "football", "5-a-side-football", "swimming-adults"
   */
  @Column({ type: 'varchar', length: 100, nullable: false })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /**
   * Emoji or icon identifier — e.g. "⚽", "🏊", "tennis-ball".
   * Rendered in the UI wherever the sport is listed.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon!: string | null;

  /**
   * Hex colour string — e.g. "#3b82f6".
   * Used to colour-code the sport in calendars and booking grids.
   */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color!: string | null;

  /**
   * Sport-specific configuration JSONB.
   *
   * Common keys (all optional):
   *   teamSize:         number    — players per team (e.g. 11 for football)
   *   minPlayers:       number    — minimum to run a session
   *   maxPlayers:       number    — max capacity per session
   *   sessionDurationMins: number — default session length
   *   ageGroups:        string[]  — e.g. ["under-8", "under-10", "adult"]
   *   equipment:        string[]  — required equipment list
   *   scoringSystem:    string    — e.g. "goals", "sets", "points"
   *   notes:            string    — admin notes
   */
  @Column({ type: 'jsonb', nullable: false, default: '{}' })
  config!: Record<string, unknown>;

  @Column({
    type:    'enum',
    enum:    ['active', 'inactive'],
    default: 'active',
  })
  status!: SportStatus;

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
