import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// ── Refund status ──────────────────────────────────────────────────────────────

/**
 * Three-phase refund lifecycle:
 *   pending    → Phase A: capacity reserved, idempotency key persisted; no journal
 *   processing → Phase C: gateway accepted, Step 1 journal posted, invoice updated
 *   completed  → Phase C2: Step 2 journal posted, cash disbursed (terminal)
 *   rejected   → Phase D: gateway rejected, no journal, capacity released (terminal)
 */
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'rejected';

/**
 * RefundEntity — Finance Engine refund aggregate.
 *
 * Rules:
 *   - All monetary fields are INTEGER minor currency units. No DECIMAL, FLOAT.
 *   - Created in Phase A before any gateway call.
 *   - idempotencyKey is stable and used as the gateway idempotency key.
 *   - step1JournalEntryId set atomically in Phase C.
 *   - step2JournalEntryId set atomically in Phase C2.
 *   - Invoice-linked only (Batch 7.4). Unallocated-payment refunds deferred to Batch 7.6.
 *
 * Capacity predicate: status IN ('pending', 'processing', 'completed')
 * Allocation predicate: status IN ('processing', 'completed')
 *
 * Table: finance_refunds
 */
@Entity('finance_refunds')
@Index(['tenantId', 'idempotencyKey'], { unique: true })
@Index(['tenantId', 'paymentId'])
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'gatewayRefundId'], { unique: true, where: '"gateway_refund_id" IS NOT NULL' })
export class RefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Human-readable reference. Format: REF-YYYYMM-NNNNN. Assigned in Phase A. */
  @Column({ name: 'refund_number', type: 'varchar', length: 20, nullable: true })
  refundNumber!: string | null;

  /** FK-equivalent → finance_payments.id */
  @Column({ name: 'payment_id', type: 'uuid', nullable: false })
  paymentId!: string;

  /** FK-equivalent → finance_invoices.id */
  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status!: RefundStatus;

  /** Amount to refund in minor currency units. Must be > 0. */
  @Column({ name: 'amount_minor', type: 'int', nullable: false })
  amountMinor!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false })
  currency!: string;

  /**
   * Refund method — determines the CR account in Step 2 journal.
   * Mirrors PaymentEntity.method.
   */
  @Column({ name: 'method', type: 'varchar', length: 20, nullable: false })
  method!: string;

  /**
   * Idempotency key (M7). Persisted in Phase A before gateway call.
   * Format: ref_<refund.id>. Stable across retries.
   * UNIQUE (tenant_id, idempotency_key) — DB-level deduplication.
   */
  @Column({ name: 'idempotency_key', type: 'varchar', length: 64, nullable: false })
  idempotencyKey!: string;

  /**
   * Caller / business idempotency key supplied by the upstream operation.
   * Format for Booking refunds: bkref_<bookingRefundId>_<bookingPaymentId>.
   * Preserved unchanged from the caller. Used for replay-safe deduplication
   * independent of the gateway key (idempotencyKey). Nullable for legacy rows.
   * UNIQUE (tenant_id, caller_idempotency_key) WHERE NOT NULL (migration 017).
   */
  @Index({ unique: true, where: '"caller_idempotency_key" IS NOT NULL' })
  @Column({ name: 'caller_idempotency_key', type: 'varchar', length: 255, nullable: true })
  callerIdempotencyKey!: string | null;

  /** Gateway-assigned refund ID. Set after Phase B. Null for cash/manual. */
  @Column({ name: 'gateway_refund_id', type: 'varchar', length: 100, nullable: true })
  gatewayRefundId!: string | null;

  // ── Journal linkage ────────────────────────────────────────────────────────

  /**
   * Step 1 journal (Phase C):
   *   DR 2120/2130 Deferred Revenue   netRefundMinor
   *   DR 2160      Tax Payable        taxRefundMinor  (summed across all tax lines)
   *   CR 2180      Refunds Payable    amountMinor
   */
  @Column({ name: 'step1_journal_entry_id', type: 'uuid', nullable: true })
  step1JournalEntryId!: string | null;

  /**
   * Step 2 journal (Phase C2):
   *   DR 2180 Refunds Payable       amountMinor
   *   CR 1130/1120/1110 Cash/Bank   amountMinor
   */
  @Column({ name: 'step2_journal_entry_id', type: 'uuid', nullable: true })
  step2JournalEntryId!: string | null;

  // ── Timestamps ─────────────────────────────────────────────────────────────

  @Column({ name: 'pending_at', type: 'timestamptz', nullable: false, default: () => 'NOW()' })
  pendingAt!: Date;

  @Column({ name: 'processing_at', type: 'timestamptz', nullable: true })
  processingAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
  rejectedAt!: Date | null;

  @Column({ name: 'rejection_reason', type: 'varchar', length: 500, nullable: true })
  rejectionReason!: string | null;

  /** Raw gateway response snapshot. */
  @Column({ name: 'gateway_metadata', type: 'jsonb', nullable: true })
  gatewayMetadata!: Record<string, unknown> | null;

  /** Cross-engine traceability (e.g. source_type='booking', source_id=bookingId). */
  @Column({ name: 'source_type', type: 'varchar', length: 20, nullable: true })
  sourceType!: string | null;

  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

// ── RefundLineAllocationEntity ─────────────────────────────────────────────────

/**
 * RefundLineAllocationEntity — per-component allocation for cumulative-delta algorithm.
 *
 * One row per component (net or tax) per refund, created atomically in Phase C.
 * INSERT-only. Never deleted or updated.
 *
 * The cumulative-delta algorithm uses these rows to compute prior_allocated:
 *   SELECT SUM(amount_minor) GROUP BY invoice_tax_id
 *   JOIN finance_refunds r ON r.id = refund_id
 *   WHERE invoice_id = :id AND r.status IN ('processing', 'completed')
 *
 * This guarantees that multiple partial refunds cumulatively and exactly reverse
 * all deferred-revenue and tax-payable components without rounding drift.
 *
 * Table: finance_refund_line_allocations
 */
@Entity('finance_refund_line_allocations')
@Index(['tenantId', 'invoiceId'])
@Index(['tenantId', 'refundId'])
export class RefundLineAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK-equivalent → finance_refunds.id */
  @Column({ name: 'refund_id', type: 'uuid', nullable: false })
  refundId!: string;

  /** FK-equivalent → finance_invoices.id */
  @Column({ name: 'invoice_id', type: 'uuid', nullable: false })
  invoiceId!: string;

  /**
   * 'net' = the deferred-revenue (pre-tax) component.
   * 'tax' = a specific tax line from finance_invoice_taxes.
   */
  @Column({ name: 'component_type', type: 'varchar', length: 10, nullable: false })
  componentType!: 'net' | 'tax';

  /**
   * Null for component_type = 'net'.
   * References finance_invoice_taxes.id for 'tax' components.
   */
  @Column({ name: 'invoice_tax_id', type: 'uuid', nullable: true })
  invoiceTaxId!: string | null;

  /** This refund's allocation to this component. Minor currency units. */
  @Column({ name: 'amount_minor', type: 'int', nullable: false })
  amountMinor!: number;

  /** INSERT-only. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
