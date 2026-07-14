import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type CorrelationSource = 'webhook' | 'api' | 'manual' | 'migration';

/**
 * BookingPaymentFinancePaymentMapEntity
 *
 * Explicit, human/webhook-asserted correlation between a Booking payment
 * (booking_payments.id) and a Finance payment (finance_payments.id).
 *
 * This is the ONLY authoritative source for Booking→Finance payment correlation
 * used by the BookingFinanceListener when creating Finance refunds.
 *
 * The mapping must NEVER be inferred from:
 *   - gateway ID equality
 *   - amount equality
 *   - timestamp proximity
 *   - allocation order
 *
 * The mapping is INSERT-only (no update or delete). Incorrect mappings are
 * corrected by adding a superseding explicit mapping via the admin API.
 *
 * Table: booking_payment_finance_payment_map
 */
@Entity('booking_payment_finance_payment_map')
@Index(['tenantId', 'bookingPaymentId', 'financePaymentId'], { unique: true })
@Index(['tenantId', 'bookingPaymentId'])
@Index(['tenantId', 'financePaymentId'])
export class BookingPaymentFinancePaymentMapEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /**
   * FK-equivalent → booking_payments.id (no DB FK — cross-domain boundary).
   * The Booking payment this Finance payment corresponds to.
   */
  @Column({ name: 'booking_payment_id', type: 'uuid', nullable: false })
  bookingPaymentId!: string;

  /**
   * FK-equivalent → finance_payments.id (no DB FK — cross-domain boundary).
   * The Finance payment that processes or records this Booking payment.
   */
  @Column({ name: 'finance_payment_id', type: 'uuid', nullable: false })
  financePaymentId!: string;

  /**
   * How this mapping was established.
   * webhook   — created by a payment webhook handler with authoritative knowledge of both IDs.
   * api       — created via the Finance admin API with explicit operator assertion.
   * manual    — created by a support operator outside the normal flow.
   * migration — created during a one-time data migration with provable identity.
   */
  @Column({ name: 'correlation_source', type: 'varchar', length: 30, nullable: false })
  correlationSource!: CorrelationSource;

  /**
   * Optional opaque external reference, e.g. the Stripe webhook event ID
   * (evt_*) or migration batch ID. Used for audit and deduplication tracing.
   */
  @Column({ name: 'external_reference', type: 'varchar', length: 255, nullable: true })
  externalReference!: string | null;

  /** Arbitrary metadata snapshot (gateway event body, admin note, etc.) */
  @Column({ name: 'metadata', type: 'jsonb', nullable: false, default: {} })
  metadata!: Record<string, unknown>;

  /** Actor UUID for human-initiated correlations; null for automated webhook producers. */
  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  /** INSERT-only — no updated_at. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
