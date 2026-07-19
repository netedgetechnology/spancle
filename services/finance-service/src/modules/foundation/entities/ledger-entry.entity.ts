import {
  Column, CreateDateColumn, Entity,
  Index, PrimaryGeneratedColumn,
} from 'typeorm';
import type { PostingStatus, DebitOrCredit } from '../aggregates/ledger-entry.aggregate';

/**
 * LedgerEntryEntity — persistence record for a LedgerEntry aggregate.
 *
 * IMMUTABLE: no UpdateDateColumn. Once POSTED, financial columns are frozen.
 * Only status and reversedById change after initial insert.
 *
 * Table: finance_ledger_entries
 */
@Entity('finance_ledger_entries')
@Index(['tenantId', 'transactionId'])
@Index(['tenantId', 'accountCode', 'accountingPeriod'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'accountingPeriod'])
export class LedgerEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK-equivalent → finance_financial_transactions.id (no DB FK — immutability) */
  @Column({ name: 'transaction_id', type: 'uuid', nullable: false })
  transactionId!: string;

  /** GL account code, e.g. '2000', '4100' */
  @Column({ name: 'account_code', type: 'varchar', length: 10, nullable: false })
  accountCode!: string;

  /** YYYY-MM period derived from postedAt */
  @Column({ name: 'accounting_period', type: 'char', length: 7, nullable: false })
  accountingPeriod!: string;

  @Column({ name: 'debit_or_credit', type: 'varchar', length: 6, nullable: false })
  debitOrCredit!: DebitOrCredit;

  /** Amount in minor currency units (INT only). Never DECIMAL. */
  @Column({ name: 'amount_minor', type: 'bigint', nullable: false })
  amountMinor!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false })
  currency!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: false })
  description!: string;

  /** Accounting effective date — may differ from createdAt for backdating. */
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: false })
  postedAt!: Date;

  @Column({ name: 'status', type: 'varchar', length: 10, nullable: false, default: 'PENDING' })
  status!: PostingStatus;

  /** Set when this entry is reversed — UUID of the reversing entry. */
  @Column({ name: 'reversed_by_id', type: 'uuid', nullable: true })
  reversedById!: string | null;

  /** Set when this entry IS the reversal — UUID of the original entry. */
  @Column({ name: 'reversal_of_id', type: 'uuid', nullable: true })
  reversalOfId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
