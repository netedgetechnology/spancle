import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * PaymentStatus lifecycle:
 *   initiated   → gateway call made, awaiting response
 *   pending     → initiated / processing (UPI collect pending customer action)
 *   captured    → funds authorised (card pre-auth, not yet settled)
 *   settled     → funds confirmed in bank (final for cash, UPI, bank transfer)
 *   failed      → gateway declined or timeout
 *   cancelled   → voided before capture
 *   refunded    → fully refunded
 *   partial_refund → partially refunded; balance still held
 */
export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'captured'
  | 'settled'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partial_refund';

/**
 * PaymentMethod — instruments supported in Sprint 6.
 * Extensible to net_banking, emi, wallet in future sprints.
 */
export type PaymentMethod =
  | 'cash'
  | 'upi'
  | 'card_debit'
  | 'card_credit'
  | 'bank_transfer'
  | 'cheque'
  | 'voucher';

/** UPI-specific metadata stored in providerMeta JSONB */
export interface UpiMeta {
  upiId?:      string;   // payer VPA e.g. user@okaxis
  vpa?:        string;   // receiver VPA
  rrn?:        string;   // RRN (RBI reference number) — for reconciliation
  txnRef?:     string;   // gateway transaction reference
  bankTxnId?:  string;   // bank transaction ID
  collectReqId?: string; // UPI collect request ID
}

/** Card-specific metadata — no raw card data ever stored */
export interface CardMeta {
  lastFour?:    string;   // last 4 digits of card
  network?:     string;   // VISA, MASTERCARD, RUPAY, AMEX
  cardType?:    string;   // debit | credit
  bankName?:    string;   // issuing bank
  emiMonths?:   number;   // 0 = no EMI
  authCode?:    string;   // authorisation code from bank
  rrn?:         string;   // RRN for reconciliation
}

/** Cash-specific metadata */
export interface CashMeta {
  receivedByUserId?: string;  // staff member who received cash
  denomination?:     Record<string, number>; // { '500': 2, '100': 3 }
  changeGiven?:      number;  // minor units
}

/**
 * PaymentEntity — a single payment leg tied to an invoice.
 *
 * Split payment model:
 *   One invoice can have N payment rows (one per method / instalment).
 *   e.g. ₹1000 invoice → ₹500 cash + ₹500 UPI = 2 PaymentEntity rows,
 *   both linked to the same invoiceId.
 *
 *   The InvoiceService listens to SETTLED events and updates
 *   invoice.amountPaidMinor / balanceDueMinor accordingly.
 *
 * Reconciliation:
 *   - settlementRef: bank reference number for end-of-day bank reconciliation.
 *   - settlementBatchId: groups payments settled in the same gateway batch.
 *   - reconciledAt: timestamp when matched against bank statement.
 *   - reconciliationStatus: pending | matched | mismatch | manual_review
 *
 * Table: payments
 */
@Entity('payments')
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'bookingId'])
@Index(['tenantId', 'branchId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'method'])
@Index(['tenantId', 'settledAt'])
@Index(['tenantId', 'reconciliationStatus'])
@Index(['tenantId', 'idempotencyKey'], { unique: true })
@Index(['providerPaymentId'])
@Index(['tenantId', 'isDeleted'])
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  /** FK → invoices.id (finance-service) */
  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  /** FK → bookings.id (booking-service, cross-service UUID) */
  @Column({ name: 'booking_id', type: 'uuid', nullable: true })
  bookingId!: string | null;

  /** FK → users.id (identity-service, cross-service UUID) */
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  // ── Amount ────────────────────────────────────────────────────────────────

  /** Amount collected via this payment leg (minor currency units — paise) */
  @Column({ name: 'amount_minor', type: 'bigint', nullable: false })
  amountMinor!: number;

  /** Amount refunded from this leg */
  @Column({ name: 'amount_refunded_minor', type: 'bigint', default: 0 })
  amountRefundedMinor!: number;

  /** Net settled: amountMinor - amountRefundedMinor */
  @Column({ name: 'net_amount_minor', type: 'bigint', nullable: false })
  netAmountMinor!: number;

  @Column({ type: 'varchar', length: 3, default: 'INR' })
  currency!: string;

  // ── Method and status ─────────────────────────────────────────────────────

  @Column({
    type: 'enum',
    enum: ['cash', 'upi', 'card_debit', 'card_credit', 'bank_transfer', 'cheque', 'voucher'],
  })
  method!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: ['initiated', 'pending', 'captured', 'settled', 'failed', 'cancelled', 'refunded', 'partial_refund'],
    default: 'initiated',
  })
  status!: PaymentStatus;

  // ── Idempotency ───────────────────────────────────────────────────────────

  /**
   * Client-provided idempotency key.
   * Unique per tenant. Prevents duplicate payment creation on retries.
   */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: false })
  idempotencyKey!: string;

  // ── Gateway / provider ────────────────────────────────────────────────────

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider!: string | null;        // 'razorpay', 'paytm', 'stripe', 'manual'

  @Column({ name: 'provider_payment_id', type: 'varchar', length: 255, nullable: true })
  providerPaymentId!: string | null;

  @Column({ name: 'provider_order_id', type: 'varchar', length: 255, nullable: true })
  providerOrderId!: string | null;

  @Column({ name: 'provider_signature', type: 'varchar', length: 500, nullable: true })
  providerSignature!: string | null;

  @Column({ name: 'gateway_fee_minor', type: 'bigint', default: 0 })
  gatewayFeeMinor!: number;

  /**
   * Provider-specific metadata — UpiMeta | CardMeta | CashMeta.
   * Never contains raw card numbers or CVV.
   */
  @Column({ name: 'provider_meta', type: 'jsonb', nullable: true })
  providerMeta!: UpiMeta | CardMeta | CashMeta | null;

  // ── Reconciliation fields ─────────────────────────────────────────────────

  /**
   * Bank settlement reference number.
   * UPI: UTR (Unique Transaction Reference)
   * Card: RRN (Retrieval Reference Number)
   * NEFT/RTGS: UTR
   * Used to match against bank statement during end-of-day reconciliation.
   */
  @Column({ name: 'settlement_ref', type: 'varchar', length: 50, nullable: true })
  settlementRef!: string | null;

  /**
   * Batch identifier from the payment gateway settlement.
   * All payments settled in the same batch share this ID.
   * Used to reconcile lump-sum bank credits.
   */
  @Column({ name: 'settlement_batch_id', type: 'varchar', length: 100, nullable: true })
  settlementBatchId!: string | null;

  @Column({
    name: 'reconciliation_status',
    type: 'enum',
    enum: ['pending', 'matched', 'mismatch', 'manual_review', 'not_applicable'],
    default: 'pending',
  })
  reconciliationStatus!: 'pending' | 'matched' | 'mismatch' | 'manual_review' | 'not_applicable';

  @Column({ name: 'reconciled_at', type: 'timestamptz', nullable: true })
  reconciledAt!: Date | null;

  @Column({ name: 'reconciled_by_id', type: 'uuid', nullable: true })
  reconciledById!: string | null;

  @Column({ name: 'reconciliation_note', type: 'varchar', length: 1000, nullable: true })
  reconciliationNote!: string | null;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @Column({ name: 'initiated_at', type: 'timestamptz', nullable: true })
  initiatedAt!: Date | null;

  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt!: Date | null;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason!: string | null;

  // ── Notes and audit ───────────────────────────────────────────────────────

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
