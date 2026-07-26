import {
  Column, CreateDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

/**
 * NotificationPreferenceEntity
 *
 * Stores a customer's per-notification-type channel preferences.
 * If no preference row exists for a user+type, the default (all channels enabled) applies.
 *
 * notificationType: matches the template slug prefix, e.g.
 *   'booking_confirmed' | 'booking_reminder' | 'booking_cancelled' |
 *   'payment_received' | 'payment_failed' | 'booking_rescheduled' |
 *   'booking_expired' | 'waitlist_promoted' | 'membership_expiry'
 *
 * enableEmail / enableSms / enablePush / enableInApp:
 *   true = customer wants this channel for this notification type (default)
 *   false = opted out
 *
 * Table: notification_preferences
 */
@Entity('notification_preferences')
@Index(['tenantId', 'userId', 'notificationType'], { unique: true })
@Index(['tenantId', 'userId'])
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** Identity-service userId — who these preferences belong to. */
  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  userId!: string;

  /**
   * Notification type slug prefix.
   * Must match one of the constants in NotificationTypes.
   */
  @Column({ name: 'notification_type', type: 'varchar', length: 80, nullable: false })
  notificationType!: string;

  @Column({ name: 'enable_email', type: 'boolean', nullable: false, default: true })
  enableEmail!: boolean;

  @Column({ name: 'enable_sms', type: 'boolean', nullable: false, default: true })
  enableSms!: boolean;

  @Column({ name: 'enable_push', type: 'boolean', nullable: false, default: true })
  enablePush!: boolean;

  @Column({ name: 'enable_in_app', type: 'boolean', nullable: false, default: true })
  enableInApp!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

/** Canonical notification type keys — used in preferences and template slugs. */
export const NotificationTypes = {
  BOOKING_CONFIRMED:      'booking_confirmed',
  BOOKING_CANCELLED:      'booking_cancelled',
  BOOKING_REMINDER:       'booking_reminder',
  BOOKING_RESCHEDULED:    'booking_rescheduled',
  BOOKING_EXPIRED:        'booking_expired',
  WAITLIST_PROMOTED:      'waitlist_promoted',
  PAYMENT_RECEIVED:       'payment_received',
  PAYMENT_FAILED:         'payment_failed',
  MEMBERSHIP_EXPIRY:      'membership_expiry',
  GUEST_BOOKING:          'guest_booking',
} as const;
