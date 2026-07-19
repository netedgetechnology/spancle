import {
  Column, CreateDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import type { FinancialTransactionType, TransactionStatus } from '../aggregates/financial-transaction.aggregate';
import type { AccountingPeriodStatus } from '../aggregates/accounting-period.aggregate';

// ── FinancialTransactionEntity ────────────────────────────────────────────────

/**
 * FinancialTransactionEntity — persistence header for a FinancialTransaction aggregate.
 *
 * Entries are stored in LedgerEntryEntity rows (one per line).
 * The transaction is the aggregate root; entries are children.
 *
 * Transitions COMMITTED → REVERSED are the only permitted updates after commit.
 *
 * Table: finance_financial_transactions
 */
@Entity('finance_financial_transactions')
@Index(['tenantId', 'accountingPeriod'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'sourceType', 'sourceId'])
@Index(['tenantId', 'transactionType'])
export class FinancialTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Human-readable reference. Format: FT-YYYYMM-NNNNN
   * Unique per tenant.
   */
  @Column({ name: 'reference', type: 'varchar', length: 30, nullable: false })
  reference!: string;

  @Column({ name: 'transaction_type', type: 'varchar', length: 30, nullable: false })
  transactionType!: FinancialTransactionType;

  /** YYYY-MM accounting period. */
  @Column({ name: 'accounting_period', type: 'char', length: 7, nullable: false })
  accountingPeriod!: string;

  /**
   * Originating domain, e.g. 'commercial_decision', 'subscription', 'refund'.
   * Cross-service reference — no DB FK.
   */
  @Column({ name: 'source_type', type: 'varchar', length: 50, nullable: true })
  sourceType!: string | null;

  /** UUID of the originating entity in the source domain. */
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: false })
  description!: string;

  @Column({ name: 'status', type: 'varchar', length: 15, nullable: false, default: 'DRAFT' })
  status!: TransactionStatus;

  /** UUID of the reversing transaction (null until reversed). */
  @Column({ name: 'reversed_by_id', type: 'uuid', nullable: true })
  reversedById!: string | null;

  /** UUID of the transaction this one reverses (null for non-reversals). */
  @Column({ name: 'reversal_of_id', type: 'uuid', nullable: true })
  reversalOfId!: string | null;

  @Column({ name: 'committed_at', type: 'timestamptz', nullable: true })
  committedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── AccountingPeriodEntity ────────────────────────────────────────────────────

/**
 * AccountingPeriodEntity — persistence for AccountingPeriod aggregate.
 *
 * One row per tenant per calendar month.
 * UNIQUE (tenantId, period) enforced at DB level.
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

  /** YYYY-MM format. Unique per tenant. */
  @Column({ name: 'period', type: 'char', length: 7, nullable: false })
  period!: string;

  @Column({ name: 'status', type: 'varchar', length: 10, nullable: false, default: 'OPEN' })
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

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
