import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * NotificationEntity
 *
 * Records every outbound notification attempt and its delivery outcome.
 *
 * Lifecycle:
 *   queued → processing → delivered | failed (retry) → failed (permanent)
 *
 * Queue job ID is stored so failed jobs can be re-queued or inspected.
 * providerRef stores the provider's message ID (nodemailer messageId, SES MessageId, etc.)
 * retryCount increments on each failed attempt before the job is re-queued.
 */
@Entity('notifications')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'recipientEmail'])
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** Tenant isolation. */
  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Human-readable display name (e.g. "Booking confirmed — BK-001"). */
  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  /** Delivery channel. */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'email' })
  channel!: 'email' | 'sms' | 'push' | 'in_app';

  /** Recipient email address (for channel=email). */
  @Column({ name: 'recipient_email', type: 'varchar', length: 254, nullable: true })
  recipientEmail!: string | null;

  /**
   * Template slug used to render this notification.
   * Null when notification was created with raw subject/body (no template).
   */
  @Column({ name: 'template_slug', type: 'varchar', length: 100, nullable: true })
  templateSlug!: string | null;

  /** Locale used for template lookup (BCP-47). */
  @Column({ type: 'varchar', length: 10, nullable: false, default: 'en' })
  locale!: string;

  /** Variable map passed to TemplateRenderer. Stored for audit/replay. */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  variables!: Record<string, unknown> | null;

  // ── Delivery status ───────────────────────────────────────────────────────

  /**
   * queued      — job created in BullMQ, not yet processed
   * processing  — worker has picked up the job
   * delivered   — provider confirmed delivery
   * failed      — all attempts exhausted
   */
  @Column({ type: 'varchar', length: 20, nullable: false, default: 'queued' })
  status!: 'queued' | 'processing' | 'delivered' | 'failed';

  /** Number of failed delivery attempts. Incremented by the consumer on each failure. */
  @Column({ name: 'retry_count', type: 'int', nullable: false, default: 0 })
  retryCount!: number;

  /**
   * Provider-assigned message identifier.
   * e.g. Nodemailer messageId, SES MessageId, Twilio SID.
   * Set on successful delivery.
   */
  @Column({ name: 'provider_ref', type: 'varchar', length: 255, nullable: true })
  providerRef!: string | null;

  /** BullMQ job ID — stored so jobs can be located for debugging. */
  @Column({ name: 'queue_job_id', type: 'varchar', length: 100, nullable: true })
  queueJobId!: string | null;

  /** Last delivery error message (for failed status). */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
