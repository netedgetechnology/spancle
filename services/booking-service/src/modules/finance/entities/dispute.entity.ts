import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Dispute lifecycle states (varchar — forward-compatible, no ALTER TYPE needed).
 *
 * Allowed transitions (enforced by DisputeService):
 *   opened → under_review → won | lost | cancelled
 *   opened → cancelled
 *   under_review → cancelled
 */
export type DisputeStatus =
  | 'opened'
  | 'under_review'
  | 'won'
  | 'lost'
  | 'cancelled';

/**
 * DisputeEntity — chargeback / dispute aggregate.
 *
 * Architecture v1.0 M2: one Dispute per gateway dispute ID per tenant.
 *
 * Rules:
 *   - All monetary fields are INTEGER minor currency units. No DECIMAL, FLOAT.
 *   - journalEntryId set atomically when the dispute is opened (open journal).
 *   - reversalJournalEntryId set atomically when the dispute is won
 *     (recovery journal) or lost (write-off does NOT reverse — it posts a
 *     new expense entry recorded in reversalJournalEntryId for traceability).
 *   - UNIQUE (tenant_id, gateway, gateway_dispute_id) prevents duplicates
 *     from webhook re-delivery.
 *   - Never hard-deleted; status = 'cancelled' is the terminal state for
 *     invalid/withdrawn disputes.
 *
 * Table: finance_disputes
 */
@Entity('finance_disputes')
@Index(['tenantId', 'gateway', 'gatewayDisputeId'], { unique: true })
@Index(['tenantId', 'paymentId'])
@Index(['tenantId', 'status'])
export class DisputeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * Human-readable dispute reference. Format: DSP-YYYYMM-NNNNN.
   * Assigned at openDispute() and immutable thereafter.
   */
  @Column({ name: 'dispute_number', type: 'varchar', length: 20, nullable: true })
  disputeNumber!: string | null;

  /** FK-equivalent → finance_payments.id (no DB FK — allows independent archival). */
  @Column({ name: 'payment_id', type: 'uuid', nullable: false })
  paymentId!: string;

  /**
   * Gateway that owns this dispute.
   * Matches PaymentEntity.gateway — values: stripe | razorpay | manual
   */
  @Column({ name: 'gateway', type: 'varchar', length: 30, nullable: false })
  gateway!: string;

  /**
   * Gateway-assigned dispute ID (e.g. Stripe DisputeId 'dp_xxx', Razorpay dispute ID).
   * Combined with (tenant_id, gateway) as the idempotency / uniqueness key.
   */
  @Column({ name: 'gateway_dispute_id', type: 'varchar', length: 100, nullable: false })
  gatewayDisputeId!: string;

  /**
   * Dispute reason code as reported by the gateway.
   * Values: fraudulent | duplicate | product_not_received | credit_not_processed |
   *         unrecognised | subscription_cancelled | general
   */
  @Column({ name: 'reason', type: 'varchar', length: 60, nullable: false })
  reason!: string;

  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'opened' })
  status!: DisputeStatus;

  // ── Amounts (all INTEGER minor currency units — no DECIMAL, FLOAT) ──────────

  /** Amount disputed by the cardholder. Must be > 0 and ≤ payment.capturedAmountMinor. */
  @Column({ name: 'disputed_amount_minor', type: 'int', nullable: false })
  disputedAmountMinor!: number;

  /**
   * Chargeback fee charged by the gateway (deducted from merchant account).
   * 0 if the gateway does not charge a fee or it is not known at open time.
   */
  @Column({ name: 'fee_amount_minor', type: 'int', nullable: false, default: 0 })
  feeAmountMinor!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false })
  currency!: string;

  // ── Dates ──────────────────────────────────────────────────────────────────

  /** When the gateway reported the dispute was opened. */
  @Column({ name: 'opened_at', type: 'timestamptz', nullable: false })
  openedAt!: Date;

  /** Deadline by which evidence must be submitted to the gateway. */
  @Column({ name: 'evidence_due_at', type: 'timestamptz', nullable: true })
  evidenceDueAt!: Date | null;

  /** When the dispute was resolved (won, lost, or cancelled). */
  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  /**
   * Resolution outcome reported by gateway.
   * Values: won | lost | cancelled — set only when status is terminal.
   */
  @Column({ name: 'resolution', type: 'varchar', length: 20, nullable: true })
  resolution!: string | null;

  // ── Journal linkage ────────────────────────────────────────────────────────

  /**
   * JournalEntry posted when the dispute was opened:
   *   DR 1190 Chargebacks Receivable
   *   DR 5100 Payment Processing Fees (if feeAmountMinor > 0)
   *   CR 1130 Merchant Settlement Account
   */
  @Column({ name: 'journal_entry_id', type: 'uuid', nullable: true })
  journalEntryId!: string | null;

  /**
   * JournalEntry posted at resolution:
   *   Won:  DR 1130 Merchant Settlement / CR 1190 Chargebacks Receivable
   *   Lost: DR 5210 Chargeback Expense  / CR 1190 Chargebacks Receivable
   */
  @Column({ name: 'resolution_journal_entry_id', type: 'uuid', nullable: true })
  resolutionJournalEntryId!: string | null;

  /** Raw gateway dispute object snapshot. */
  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  // ── Audit ──────────────────────────────────────────────────────────────────

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
