import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * AccountingPeriodStatus — lifecycle of an accounting period.
 *
 *   open     → journal entries accepted for any date within this period
 *   closing  → transition state; no new entries; GL snapshot in progress
 *   closed   → entries rejected; GL snapshot written
 *   locked   → fully immutable; only SUPER_ADMIN can reopen (audit trail required)
 *
 * Stored as varchar for forward-compatibility.
 */
export type AccountingPeriodStatus = 'open' | 'closing' | 'closed' | 'locked';

/**
 * AccountingPeriodEntity — one row per calendar month per tenant.
 *
 * Rules enforced at application layer:
 *   1. Exactly one period per tenant is in 'open' status at any time.
 *   2. Journal entries cannot be posted into a 'closed' or 'locked' period.
 *   3. Backdating into a prior 'open' period requires TENANT_ADMIN role.
 *   4. Period close writes gl_balances snapshot atomically with status change.
 *
 * Table: finance_accounting_periods
 */
@Entity('finance_accounting_periods')
@Index(['tenantId', 'period'], { unique: true })
@Index(['tenantId', 'status'])
export class AccountingPeriodEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * YYYY-MM format — e.g. '2026-07'.
   * Unique per tenant; drives all date-boundary checks.
   */
  @Column({ type: 'char', length: 7, nullable: false })
  period!: string;

  @Column({ type: 'varchar', length: 15, nullable: false, default: 'open' })
  status!: AccountingPeriodStatus;

  @Column({ name: 'opened_at', type: 'timestamptz', nullable: false })
  openedAt!: Date;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt!: Date | null;

  @Column({ name: 'locked_at', type: 'timestamptz', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'closed_by_id', type: 'uuid', nullable: true })
  closedById!: string | null;

  @Column({ name: 'locked_by_id', type: 'uuid', nullable: true })
  lockedById!: string | null;

  /**
   * Optional note — required when SUPER_ADMIN reopens a closed period.
   */
  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
