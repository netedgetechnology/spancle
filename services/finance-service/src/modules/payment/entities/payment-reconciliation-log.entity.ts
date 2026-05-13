import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

export type ReconciliationAction =
  | 'batch_import'       // bank statement file imported
  | 'auto_matched'       // system matched to bank record
  | 'manual_matched'     // admin confirmed match
  | 'mismatch_flagged'   // amount mismatch detected
  | 'dispute_raised'     // dispute opened with bank/gateway
  | 'dispute_resolved'   // dispute closed
  | 'writeoff'           // small mismatch written off
  | 'note_added';        // admin annotation

/**
 * PaymentReconciliationLogEntity — immutable reconciliation audit trail.
 * INSERT only. Tracks every state change during the reconciliation workflow.
 *
 * Table: payment_reconciliation_logs
 */
@Entity('payment_reconciliation_logs')
@Index(['tenantId', 'paymentId'])
@Index(['tenantId', 'action'])
@Index(['tenantId', 'createdAt'])
export class PaymentReconciliationLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: false })
  paymentId!: string;

  @Column({
    type: 'enum',
    enum: [
      'batch_import', 'auto_matched', 'manual_matched', 'mismatch_flagged',
      'dispute_raised', 'dispute_resolved', 'writeoff', 'note_added',
    ],
  })
  action!: ReconciliationAction;

  /** Our recorded amount (minor units) */
  @Column({ name: 'expected_amount_minor', type: 'bigint', nullable: true })
  expectedAmountMinor!: number | null;

  /** Bank-reported amount (minor units) */
  @Column({ name: 'actual_amount_minor', type: 'bigint', nullable: true })
  actualAmountMinor!: number | null;

  /** Difference: actualAmountMinor - expectedAmountMinor */
  @Column({ name: 'delta_minor', type: 'bigint', nullable: true })
  deltaMinor!: number | null;

  /** Bank statement UTR / RRN that matched this payment */
  @Column({ name: 'bank_reference', type: 'varchar', length: 100, nullable: true })
  bankReference!: string | null;

  @Column({ name: 'bank_settlement_date', type: 'date', nullable: true })
  bankSettlementDate!: string | null;

  @Column({ name: 'batch_id', type: 'varchar', length: 100, nullable: true })
  batchId!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
