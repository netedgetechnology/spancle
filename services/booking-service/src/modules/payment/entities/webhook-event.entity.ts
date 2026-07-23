import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * WebhookEventEntity — immutable record of every inbound webhook payload.
 *
 * Purposes:
 *   1. Idempotency gate — unique (tenantId, provider, providerEventId) prevents
 *      processing the same webhook twice even if the provider sends it multiple times.
 *   2. Audit trail — raw payload stored for debugging and replay.
 *   3. Forensics — status tracks whether processing succeeded or failed.
 *
 * Architecture:
 *   - INSERT on first delivery (before processing).
 *   - UPDATE status after processing (success / failed).
 *   - Unique constraint (tenantId, provider, providerEventId) is the dedup guard.
 *
 * No DELETE. No soft delete.
 * Table: payment_webhook_events
 */
@Entity('payment_webhook_events')
@Index(['tenantId', 'provider', 'providerEventId'], { unique: true })
@Index(['tenantId', 'provider', 'status'])
@Index(['tenantId', 'createdAt'])
export class WebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Gateway name: 'stripe' | 'razorpay' | future */
  @Column({ name: 'provider', type: 'varchar', length: 30, nullable: false })
  provider!: string;

  /** Provider's unique event identifier (e.g. Stripe evt_xxx, Razorpay webhookId). */
  @Column({ name: 'provider_event_id', type: 'varchar', length: 255, nullable: false })
  providerEventId!: string;

  /** Provider's event type string (e.g. 'payment_intent.succeeded'). */
  @Column({ name: 'event_type', type: 'varchar', length: 100, nullable: false })
  eventType!: string;

  /** Raw JSON payload exactly as received — never mutated. */
  @Column({ name: 'raw_payload', type: 'jsonb', nullable: false })
  rawPayload!: Record<string, unknown>;

  /** Signature header value received with the webhook. */
  @Column({ name: 'signature_header', type: 'text', nullable: true })
  signatureHeader!: string | null;

  /** processing | processed | failed | ignored */
  @Column({ name: 'status', type: 'varchar', length: 20, nullable: false, default: 'processing' })
  status!: 'processing' | 'processed' | 'failed' | 'ignored';

  /** Human-readable error when status=failed. */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  /** ID of the Finance PaymentEntity updated as a result of this webhook. */
  @Column({ name: 'linked_payment_id', type: 'uuid', nullable: true })
  linkedPaymentId!: string | null;

  /** Source IP of the webhook delivery. */
  @Column({ name: 'source_ip', type: 'varchar', length: 45, nullable: true })
  sourceIp!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}
