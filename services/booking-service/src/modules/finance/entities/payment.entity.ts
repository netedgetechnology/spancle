import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// ── Payment status ────────────────────────────────────────────────────────────

/**
 * Payment lifecycle states (varchar — no ALTER TYPE needed for extensions).
 *
 * Allowed transitions:
 *   initiated → authorized → captured → (allocated to invoices)
 *   initiated → failed
 *   authorized → captured | failed | cancelled
 *   captured → chargedback (Batch 7.3)
 */
export type PaymentStatus =
  | 'initiated'
  | 'authorized'
  | 'captured'
  | 'failed'
  | 'cancelled'
  | 'chargedback';   // Dispute aggregate (Batch 7.3)

/**
 * Payment method — determines gateway routing and GL account.
 * Stored as varchar for forward-compatibility.
 */
export type PaymentMethod =
  | 'online_card'
  | 'card_present'
  | 'cash'
  | 'upi'
  | 'wallet'
  | 'bank_transfer'
  | 'voucher';

/**
 * PaymentEntity — a single payment attempt.
 *
 * Rules:
 *   - All monetary fields are INTEGER minor currency units. No DECIMAL, FLOAT.
 *   - One Payment per gateway transaction attempt.
 *   - Split payments (cash + wallet) → two separate Payment rows allocated
 *     against the same invoice via PaymentAllocationEntity.
 *   - idempotency_key prevents duplicate payments on retry.
 *   - Allocation to invoices is managed exclusively by PaymentService.allocate().
 *   - Journal entry is posted by DoubleEntryService inside PaymentService.capture().
 *
 * Table: finance_payments
 */
@Entity('finance_payments')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'customerId'])
@Index(['tenantId', 'idempotencyKey'], { unique: true, where: '"idempotency_key" IS NOT NULL' })
@Index(['tenantId', 'gatewayPaymentId'], { where: '"gateway_payment_id" IS NOT NULL' })
@Index(['tenantId', 'capturedAt'], { where: '"captured_at" IS NOT NULL' })
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Human-readable reference. Format: PAY-YYYYMM-NNNNN.
   * Assigned at initiate(). Immutable thereafter.
   */
  @Column({ name: 'reference', type: 'varchar', length: 20, nullable: true })
  reference!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'initiated' })
  status!: PaymentStatus;

  @Column({ name: 'method', type: 'varchar', length: 20, nullable: false })
  method!: PaymentMethod;

  /**
   * Gateway identifier. Determines which PaymentGatewayAdapter to use.
   * Values: stripe | razorpay | cash | manual
   * Stored as varchar — new gateways added without schema change.
   */
  @Column({ name: 'gateway', type: 'varchar', length: 30, nullable: false })
  gateway!: string;

  /**
   * Gateway-assigned payment ID (e.g. Stripe PaymentIntent ID, Razorpay Order ID).
   * null until the gateway responds after initiation.
   */
  @Column({ name: 'gateway_payment_id', type: 'varchar', length: 100, nullable: true })
  gatewayPaymentId!: string | null;

  /** Raw gateway status string (e.g. 'requires_capture', 'succeeded'). */
  @Column({ name: 'gateway_status', type: 'varchar', length: 50, nullable: true })
  gatewayStatus!: string | null;

  /**
   * Idempotency key — caller-supplied to prevent duplicate payments on retry.
   * Architecture v1.0 M7: UNIQUE (tenant_id, idempotency_key).
   */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 64, nullable: true })
  idempotencyKey!: string | null;

  // ── Amounts (all INTEGER minor currency units — no DECIMAL, FLOAT) ──────────

  @Column({ name: 'amount_minor', type: 'int', nullable: false })
  amountMinor!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false, default: 'GBP' })
  currency!: string;

  /** Amount actually captured (may differ from amountMinor on partial capture). */
  @Column({ name: 'captured_amount_minor', type: 'int', nullable: false, default: 0 })
  capturedAmountMinor!: number;

  /** Amount already allocated to invoices (sum of PaymentAllocation rows). */
  @Column({ name: 'allocated_minor', type: 'int', nullable: false, default: 0 })
  allocatedMinor!: number;

  /** Unallocated balance = capturedAmountMinor - allocatedMinor. */
  @Column({ name: 'unallocated_minor', type: 'int', nullable: false, default: 0 })
  unallocatedMinor!: number;

  // ── Customer ──────────────────────────────────────────────────────────────

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  // ── Journal linkage ───────────────────────────────────────────────────────

  /**
   * JournalEntry ID posted when this payment was captured.
   * null until capture(). Populated by DoubleEntryService.post().
   */
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
  journalEntryId!: string | null;

  // ── Timestamps ────────────────────────────────────────────────────────────

  @Column({ name: 'authorized_at', type: 'timestamptz', nullable: true })
  authorizedAt!: Date | null;

  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  /** Free-text failure reason from gateway. */
  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason!: string | null;

  /** Raw JSON snapshot of the gateway response at capture time. */
  @Column({ name: 'gateway_metadata', type: 'jsonb', nullable: true })
  gatewayMetadata!: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'device_id', type: 'varchar', length: 100, nullable: true })
  deviceId!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── PaymentAllocationEntity ───────────────────────────────────────────────────

/**
 * PaymentAllocationEntity — maps a payment to one or more invoices.
 *
 * Rules:
 *   - INSERT-only. Never mutated after creation.
 *   - One row per (payment, invoice) pair.
 *   - allocatedMinor is the portion of the payment applied to this invoice.
 *   - Multiple allocations can exist against the same invoice (instalment-style).
 *   - PaymentService is the sole writer of this table.
 *   - InvoiceService.amountPaidMinor and outstandingMinor are updated as a
 *     side-effect of allocation (within the same transaction).
 *
 * Table: finance_payment_allocations
 */
@Entity('finance_payment_allocations')
@Index(['tenantId', 'paymentId'])
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'invoiceId', 'paymentId'], { unique: true })
export class PaymentAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK-equivalent → finance_payments.id (no DB FK — allows independent archival). */
  @Column({ name: 'payment_id', type: 'uuid', nullable: false })
  paymentId!: string;

  /** FK-equivalent → finance_invoices.id. */
  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  /** Amount from this payment applied to this invoice. Minor currency units. */
  @Column({ name: 'allocated_minor', type: 'int', nullable: false })
  allocatedMinor!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false })
  currency!: string;

  /** INSERT-only. No updated_at. */
  @CreateDateColumn({ name: 'allocated_at', type: 'timestamptz' })
  allocatedAt!: Date;
}
