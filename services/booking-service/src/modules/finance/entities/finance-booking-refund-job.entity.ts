import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type BookingRefundJobStatus = 'pending' | 'processing' | 'retry' | 'completed';

/**
 * FinanceBookingRefundJobEntity — durable work item for BOOKING_REFUNDED processing.
 *
 * The BOOKING_REFUNDED listener creates one job per booking refund event.
 * A @Cron scheduler calls processJob() for each pending/retry job.
 * The job is replay-safe: each Finance refund allocation uses a stable
 * callerIdempotencyKey (bkref_<bookingRefundId>_<bookingPaymentId>).
 *
 * UNIQUE (tenant_id, booking_refund_id) — one job per booking refund.
 *
 * Table: finance_booking_refund_jobs
 */
@Entity('finance_booking_refund_jobs')
@Index(['tenantId', 'bookingRefundId'], { unique: true })
@Index(['tenantId', 'status', 'nextAttemptAt'])
export class FinanceBookingRefundJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK-equivalent → booking_refunds.id (no DB FK — cross-domain boundary) */
  @Column({ name: 'booking_refund_id', type: 'uuid', nullable: false })
  bookingRefundId!: string;

  /** FK-equivalent → bookings.id (for plan rebuild) */
  @Column({ name: 'booking_id', type: 'uuid', nullable: false })
  bookingId!: string;

  /** Total refund amount in minor currency units. Must be > 0. */
  @Column({ name: 'amount_minor', type: 'int', nullable: false })
  amountMinor!: number;

  @Column({ name: 'currency', type: 'varchar', length: 3, nullable: false })
  currency!: string;

  /** Actor who triggered the booking refund. Null for automated/webhook flows. */
  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  /**
   * Job lifecycle status.
   * pending    → created; waiting for first processing attempt
   * processing → currently being processed by the scheduler
   * retry      → last attempt failed; scheduled for next attempt
   * completed  → all Finance refunds issued successfully
   */
  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'pending' })
  status!: BookingRefundJobStatus;

  @Column({ name: 'attempt_count', type: 'int', nullable: false, default: 0 })
  attemptCount!: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  /** When this job should next be picked up by the scheduler. */
  @Column({ name: 'next_attempt_at', type: 'timestamptz', nullable: false, default: () => 'NOW()' })
  nextAttemptAt!: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
