import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * JournalEntryType — what business event produced this entry.
 * varchar for forward-compatibility.
 */
export type JournalEntryType =
  | 'invoice'
  | 'payment'
  | 'refund'
  | 'credit_note'
  | 'debit_note'
  | 'adjustment'
  | 'opening'
  | 'closing'
  | 'reversal'
  | 'chargeback'
  | 'wallet_credit'
  | 'wallet_debit'
  | 'revenue_recognition';

/**
 * JournalEntryEntity — the header of a balanced double-entry journal entry.
 *
 * IMMUTABLE: no UPDATE, no DELETE. Errors corrected by reversal entries only.
 *
 * Reversal linkage:
 *   reversalOf  — UUID of the original entry this one reverses
 *   reversedBy  — UUID of the reversing entry (set on the original after reversal is posted)
 *
 * Table: finance_journal_entries
 */
@Entity('finance_journal_entries')
@Index(['tenantId', 'sourceId'])
@Index(['tenantId', 'accountingPeriod'])
@Index(['tenantId', 'entryType'])
@Index(['tenantId', 'postedAt'])
export class JournalEntryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Human-readable reference — JNL-YYYYMM-NNNNN.
   * Unique per tenant; assigned by JournalService at post time.
   */
  @Column({ type: 'varchar', length: 30, nullable: false })
  reference!: string;

  @Column({ name: 'entry_type', type: 'varchar', length: 30, nullable: false })
  entryType!: JournalEntryType;

  /**
   * What engine produced this entry.
   * Values: booking | membership | academy | tournament | pos | wallet | manual
   */
  @Column({ name: 'source_type', type: 'varchar', length: 30, nullable: true })
  sourceType!: string | null;

  /**
   * UUID of the originating entity (bookingId, membershipId, invoiceId, etc.).
   * Cross-service reference — no DB FK.
   */
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: false })
  description!: string;

  /**
   * Accounting effective date — may differ from createdAt.
   * Validated against open accounting periods by AccountingPeriodService.
   * Backdating into a prior open period requires TENANT_ADMIN role.
   */
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: false })
  postedAt!: Date;

  /**
   * YYYY-MM period of postedAt — denormalised for efficient period queries.
   * Set by JournalService from postedAt at insert time.
   */
  @Column({ name: 'accounting_period', type: 'char', length: 7, nullable: false })
  accountingPeriod!: string;

  /**
   * UUID of the reversing entry (null until this entry is reversed).
   * Set on the original entry after the reversal is posted.
   */
  @Column({ name: 'reversed_by', type: 'uuid', nullable: true })
  reversedBy!: string | null;

  /**
   * UUID of the original entry this entry reverses (null for non-reversals).
   */
  @Column({ name: 'reversal_of', type: 'uuid', nullable: true })
  reversalOf!: string | null;

  /**
   * Immutable wall-clock timestamp — set by DB at INSERT time.
   * Never equals postedAt for backdated entries.
   */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

// ── JournalLineEntity ──────────────────────────────────────────────────────────

/**
 * JournalLineEntity — a single debit or credit line within a JournalEntry.
 *
 * IMMUTABLE: no UPDATE, no DELETE.
 *
 * Constraint: exactly one of debitMinor or creditMinor is > 0 per row.
 * Enforced at application layer by DoubleEntryService; also documented here.
 *
 * All amounts in minor currency units (INTEGER). Never DECIMAL or FLOAT.
 *
 * Table: finance_journal_lines
 */
@Entity('finance_journal_lines')
@Index(['tenantId', 'journalEntryId'])
@Index(['tenantId', 'accountCode', 'postedAt'])
export class JournalLineEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * FK equivalent to finance_journal_entries.id (same DB, no constraint —
   * immutability is enforced at application layer, not by FK CASCADE rules).
   */
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: false })
  journalEntryId!: string;

  /**
   * FK equivalent to finance_accounts.code.
   * Stored as code string (not UUID) so GL queries need no join with accounts table.
   */
  @Column({ name: 'account_code', type: 'varchar', length: 10, nullable: false })
  accountCode!: string;

  /**
   * Debit amount in minor currency units (pence/cents/paisa).
   * Exactly one of debitMinor / creditMinor is > 0; the other is 0.
   * Never negative. Never DECIMAL.
   */
  @Column({ name: 'debit_minor', type: 'int', nullable: false, default: 0 })
  debitMinor!: number;

  /**
   * Credit amount in minor currency units.
   * Exactly one of debitMinor / creditMinor is > 0; the other is 0.
   */
  @Column({ name: 'credit_minor', type: 'int', nullable: false, default: 0 })
  creditMinor!: number;

  /** ISO-4217 currency code — inherited from the journal entry context. */
  @Column({ type: 'varchar', length: 3, nullable: false, default: 'GBP' })
  currency!: string;

  /**
   * Accounting effective date — denormalised from JournalEntry.postedAt
   * for efficient GL balance queries without joins.
   */
  @Column({ name: 'posted_at', type: 'timestamptz', nullable: false })
  postedAt!: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  /** Immutable wall-clock insert timestamp. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
