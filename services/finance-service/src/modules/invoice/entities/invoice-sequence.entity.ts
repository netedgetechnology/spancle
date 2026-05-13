import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * InvoiceSequenceEntity — atomic invoice number sequence counter.
 *
 * One row per (tenantId, branchCode, financialYear).
 * The sequence is incremented atomically in the DB using
 * UPDATE ... RETURNING to prevent gaps and duplicates under concurrency.
 *
 * Table: invoice_sequences
 */
@Entity('invoice_sequences')
@Index(['tenantId', 'branchCode', 'financialYear'], { unique: true })
export class InvoiceSequenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Short branch identifier used in invoice number. e.g. 'MUM', 'DEL', 'HYD' */
  @Column({ name: 'branch_code', type: 'varchar', length: 10, nullable: false })
  branchCode!: string;

  /** Financial year string. Format: YYYY-YY. e.g. '2024-25' */
  @Column({ name: 'financial_year', type: 'varchar', length: 7, nullable: false })
  financialYear!: string;

  /** Current sequence value — last number issued */
  @Column({ name: 'current_seq', type: 'int', default: 0 })
  currentSeq!: number;

  /** Optional custom prefix. Defaults to 'INV'. e.g. 'INV', 'CRED', 'PRO' */
  @Column({ type: 'varchar', length: 10, default: 'INV' })
  prefix!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
