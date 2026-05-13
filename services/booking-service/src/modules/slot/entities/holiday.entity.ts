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
 * Holiday source:
 *   system   — pre-seeded by Spancle (UK bank holidays, etc.)
 *   tenant   — custom holidays added by the tenant admin
 */
export type HolidaySource = 'system' | 'tenant';

/**
 * HolidayEntity — a public holiday or custom closure date.
 *
 * Purpose:
 *   1. Trigger holiday pricing rules in PricingService
 *   2. Optionally skip slot generation on these dates (controlled per template)
 *   3. Surface in the admin calendar as highlighted dates
 *
 * Recurrence:
 *   - isRecurring = true: the holiday repeats every year on the same date
 *     (e.g. Christmas Day — Dec 25). The year in `date` is ignored.
 *   - isRecurring = false: one-off holiday on a specific date with year.
 *
 * System holidays:
 *   Seeded by HolidayService.seedSystemHolidays() for common locales.
 *   Tenants can override a system holiday by creating a tenant-scoped
 *   record with the same date and isActive=false (disables the system one).
 *
 * Table: holidays
 */
@Entity('holidays')
@Index(['tenantId', 'date'])
@Index(['tenantId', 'source'])
@Index(['tenantId', 'isActive'])
@Index(['tenantId', 'isDeleted'])
export class HolidayEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Display name — e.g. "Christmas Day", "Spring Bank Holiday" */
  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  /**
   * The holiday date in ISO format: YYYY-MM-DD.
   * For recurring holidays, the year is ignored in matching.
   */
  @Column({ type: 'date', nullable: false })
  date!: string;

  /** If true, this holiday repeats every year on the same MM-DD */
  @Column({ name: 'is_recurring', type: 'boolean', default: false })
  isRecurring!: boolean;

  @Column({
    type:    'enum',
    enum:    ['system', 'tenant'],
    default: 'tenant',
  })
  source!: HolidaySource;

  /**
   * ISO 3166-1 alpha-2 country code — used to scope system holidays.
   * e.g. 'GB', 'US'. Null = applies to all countries.
   */
  @Column({ name: 'country_code', type: 'varchar', length: 2, nullable: true })
  countryCode!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

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
