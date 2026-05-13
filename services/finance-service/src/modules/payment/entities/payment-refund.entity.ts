import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export type RefundStatus =
  | 'initiated'
  | 'pending'
  | 'processed'
  | 'failed'
  | 'rejected';

export type RefundReason =
  | 'customer_request'
  | 'booking_cancelled'
  | 'booking_rescheduled'
  | 'duplicate_payment'
  | 'overcharge'
  | 'service_not_rendered'
  | 'goodwill'
  | 'system_error'
  | 'other';

/**
 * PaymentRefundEntity — a refund against a payment leg.
 *
 * One payment can have multiple partial refunds.
 * The sum of all processed refunds must never exceed the original payment amount.
 * This constraint is enforced in PaymentRefundService.create().
 *
 * Method-specific behaviour:
 *   cash        → refund handled offline; only status tracking here
 *   upi         → gateway reverse payment; providerRefundId = gateway UTR
 *   card        → gateway void/refund; providerRefundId = ARN (Acquirer Reference Number)
 *   bank_transfer → NEFT/RTGS credit back; providerRefundId = UTR
 *
 * Reconciliation:
 *   - reconciledAt set when the refund credit appears in the bank statement.
 *   - For offline methods (cash, cheque) reconciliationStatus = 'not_applicable'.
 *
 * Table: payment_refunds
 */
@Entity('payment_refunds')
@Index(['tenantId', 'paymentId'])
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'bookingId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'reconciliationStatus'])
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'isDeleted'])
export class PaymentRefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  /** FK → payments.id */
  @Column({ name: 'payment_id', type: 'uuid', nullable: false })
  paymentId!: string;

  /** Denormalised from parent payment for direct querying */
  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  // ── Amount ────────────────────────────────────────────────────────────────

  @Column({ name: 'amount_minor', type: 'bigint', nullable: false })
  amountMinor!: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  // ── Classification ────────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['initiated', 'pending', 'processed', 'failed', 'rejected'],
    default: 'initiated',
  })
  status!: RefundStatus;

  @Column({
    type: 'enum',
    enum: [
      'customer_request', 'booking_cancelled', 'booking_rescheduled',
      'duplicate_payment', 'overcharge', 'service_not_rendered',
      'goodwill', 'system_error', 'other',
    ],
    default: 'other',
  })
  reason!: RefundReason;

  @Column({ name: 'reason_notes', type: 'varchar', length: 1000, nullable: true })
  reasonNotes!: string | null;

  // ── Gateway ───────────────────────────────────────────────────────────────

  @Column({ name: 'provider_refund_id', type: 'varchar', length: 255, nullable: true })
  providerRefundId!: string | null;

  @Column({ name: 'provider_refund_ref', type: 'varchar', length: 255, nullable: true })
  providerRefundRef!: string | null;

  @Column({ name: 'gateway_fee_minor', type: 'bigint', default: 0 })
  gatewayFeeMinor!: number;

  // ── Reconciliation ────────────────────────────────────────────────────────

  @Column({ name: 'settlement_ref', type: 'varchar', length: 50, nullable: true })
  settlementRef!: string | null;

  @Column({
    name: 'reconciliation_status',
    type: 'enum',
    enum: ['pending', 'matched', 'mismatch', 'manual_review', 'not_applicable'],
    default: 'pending',
  })
  reconciliationStatus!: 'pending' | 'matched' | 'mismatch' | 'manual_review' | 'not_applicable';

  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
  reconciledAt!: Date | null;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason!: string | null;

  // ── Audit ─────────────────────────────────────────────────────────────────

  @Column({ name: 'created_by_id', type: 'uuid', nullable: false })
  createdById!: string;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
