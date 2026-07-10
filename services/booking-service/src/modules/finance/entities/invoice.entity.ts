import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Invoice status lifecycle.
 * Stored as varchar for forward-compatibility — no ALTER TYPE needed for new states.
 *
 * Allowed transitions (enforced by InvoiceService):
 *   draft  → pending | voided
 *   pending → issued | voided
 *   issued  → partially_paid | paid | voided         (payment populated in Batch 7.2)
 *   partially_paid → paid | voided
 *   paid    → (terminal)
 *   voided  → (terminal)
 */
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'issued'
  | 'partially_paid'
  | 'paid'
  | 'voided';

/**
 * Source types that can originate an invoice.
 * Finance owns the mapping; source engines never write to finance tables.
 */
export type InvoiceSourceType =
  | 'booking'
  | 'membership'
  | 'academy'
  | 'tournament'
  | 'pos'
  | 'marketplace'
  | 'manual';

/**
 * InvoiceEntity — the root financial document aggregate.
 *
 * Rules:
 *   - Immutable after status reaches 'issued'. Amendments create a void + new draft.
 *   - All monetary fields are INTEGER minor currency units. No DECIMAL, no FLOAT.
 *   - Customer fields are snapshotted at creation — Finance never calls Identity.
 *   - A void posts a reversing journal entry via DoubleEntryService.reverse().
 *   - invoice_number is tenant-scoped and financial-year-aware: INV-YYYY-NNNNN.
 *     The year segment uses the financial year start month configured per tenant
 *     (defaults to calendar year if not configured).
 *
 * Table: finance_invoices
 */
@Entity('finance_invoices')
@Index(['tenantId', 'invoiceNumber'], { unique: true })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'customerId'])
@Index(['tenantId', 'issuedAt'])
@Index(['tenantId', 'dueAt'], { where: '"due_at" IS NOT NULL' })
@Index(['tenantId', 'isDeleted'])
export class InvoiceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Human-readable invoice number. Unique per tenant.
   * Format: INV-YYYY-NNNNN where YYYY = financial year, NNNNN = sequential.
   * Assigned when the invoice moves from draft → pending (finalise()).
   * null while still in draft state.
   */
  @Column({ name: 'invoice_number', type: 'varchar', length: 20, nullable: true })
  invoiceNumber!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'draft' })
  status!: InvoiceStatus;

  /**
   * What engine originated this invoice.
   * Finance uses this for GL account selection and reporting.
   */
  @Column({ name: 'source_type', type: 'varchar', length: 20, nullable: false })
  sourceType!: InvoiceSourceType;

  /**
   * UUID of the originating entity (bookingId, membershipId, etc.).
   * Indexed via invoice_references table for O(1) lookup from source entity.
   */
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId!: string | null;

  // ── Customer snapshot ──────────────────────────────────────────────────────
  // Captured at invoice creation. Finance never calls Identity to re-fetch.

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId!: string | null;

  @Column({ name: 'customer_name', type: 'varchar', length: 200, nullable: false })
  customerName!: string;

  @Column({ name: 'customer_email', type: 'varchar', length: 250, nullable: true })
  customerEmail!: string | null;

  // ── Amounts (all minor currency units — INTEGER only) ──────────────────────

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false, default: 'GBP' })
  currency!: string;

  /** Sum of all line subtotals before discount and tax. */
  @Column({ name: 'subtotal_minor', type: 'int', nullable: false, default: 0 })
  subtotalMinor!: number;

  /** Total discount across all lines. */
  @Column({ name: 'discount_minor', type: 'int', nullable: false, default: 0 })
  discountMinor!: number;

  /** Sum of all InvoiceTax rows. Computed at finalise(). */
  @Column({ name: 'tax_minor', type: 'int', nullable: false, default: 0 })
  taxMinor!: number;

  /**
   * Grand total = subtotalMinor - discountMinor + taxMinor (exclusive)
   * or subtotalMinor (inclusive — tax already embedded).
   * Computed and locked at finalise(). Never recomputed after that.
   */
  @Column({ name: 'total_minor', type: 'int', nullable: false, default: 0 })
  totalMinor!: number;

  /**
   * Amount paid against this invoice. Maintained by PaymentService (Batch 7.2).
   * Placeholder at 0; populated when payments are allocated.
   */
  @Column({ name: 'amount_paid_minor', type: 'int', nullable: false, default: 0 })
  amountPaidMinor!: number;

  /** Computed: totalMinor - amountPaidMinor. Maintained by PaymentService. */
  @Column({ name: 'outstanding_minor', type: 'int', nullable: false, default: 0 })
  outstandingMinor!: number;

  // ── Dates ──────────────────────────────────────────────────────────────────

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'due_at', type: 'timestamptz', nullable: true })
  dueAt!: Date | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt!: Date | null;

  @Column({ name: 'void_reason', type: 'varchar', length: 500, nullable: true })
  voidReason!: string | null;

  /**
   * Revenue recognition period boundaries.
   * Populated at creation from the event payload.
   * Finance revenue-recognition scheduler uses these to pro-rata earned revenue.
   */
  @Column({ name: 'period_start', type: 'timestamptz', nullable: true })
  periodStart!: Date | null;

  @Column({ name: 'period_end', type: 'timestamptz', nullable: true })
  periodEnd!: Date | null;

  // ── Journal linkage ────────────────────────────────────────────────────────

  /**
   * ID of the JournalEntry posted when this invoice was finalised.
   * Populated by DoubleEntryService.post() in InvoiceService.finalise().
   * null until finalised.
   */
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
  journalEntryId!: string | null;

  // ── Pricing traceability (M5) ──────────────────────────────────────────────

  /**
   * Coupon code applied to this invoice, if any.
   * Denormalised from the event payload for fast coupon-performance reporting.
   */
  @Column({ name: 'coupon_code', type: 'varchar', length: 50, nullable: true })
  couponCode!: string | null;

  // ── Soft state ────────────────────────────────────────────────────────────

  /**
   * Soft-flag for archival queries. Finance never hard-deletes invoices.
   * Voided invoices remain queryable with isDeleted = false.
   * isDeleted is set only if a tenant is fully offboarded.
   */
  @Column({ name: 'is_deleted', type: 'boolean', nullable: false, default: false })
  isDeleted!: boolean;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
