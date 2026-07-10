import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Account type — determines normal balance (debit or credit).
 *
 *   asset     — normal debit  (cash, receivables, clearing)
 *   liability — normal credit (payables, deferred revenue, tax payable)
 *   equity    — normal credit (retained earnings)
 *   revenue   — normal credit (all income streams)
 *   expense   — normal debit  (processing fees, refunds, write-offs)
 */
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

/**
 * ChartOfAccountEntity — a node in the Chart of Accounts tree.
 *
 * System accounts (isSystem = true) are seeded at first boot and cannot
 * be deleted or have their code/type changed.
 * Tenant admins can create sub-accounts under system accounts.
 *
 * Code format: NNN or NNNN (3-4 digit numeric string, e.g. '1120', '4110').
 *   1xxx — Assets
 *   2xxx — Liabilities
 *   3xxx — Equity
 *   4xxx — Revenue
 *   5xxx — Expenses
 *
 * Table: finance_accounts
 */
@Entity('finance_accounts')
@Index(['tenantId', 'code'], { unique: true })
@Index(['tenantId', 'type'])
@Index(['tenantId', 'parentCode'])
export class ChartOfAccountEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Numeric code string — unique per tenant.
   * 3-digit for root categories, 4-digit for sub-accounts.
   */
  @Column({ type: 'varchar', length: 10, nullable: false })
  code!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 15, nullable: false })
  type!: AccountType;

  /**
   * Parent account code — null for root accounts (1xx, 2xx, 3xx, 4xx, 5xx).
   * Hierarchy is code-based (not ID-based) for readability in reports.
   */
  @Column({ name: 'parent_code', type: 'varchar', length: 10, nullable: true })
  parentCode!: string | null;

  /**
   * Whether this account can receive journal line postings.
   * Root category accounts (3-digit) are typically non-postable.
   * Sub-accounts (4-digit) are postable.
   */
  @Column({ name: 'is_postable', type: 'boolean', nullable: false, default: true })
  isPostable!: boolean;

  /**
   * System accounts are seeded and cannot be deleted or have code/type altered.
   * All default Spancle accounts are isSystem = true.
   * Tenant-created sub-accounts are isSystem = false.
   */
  @Column({ name: 'is_system', type: 'boolean', nullable: false, default: false })
  isSystem!: boolean;

  @Column({ name: 'is_active', type: 'boolean', nullable: false, default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
