import {
  Column, CreateDateColumn, Entity,
  Index, PrimaryGeneratedColumn,
} from 'typeorm';

export type BookingLogAction =
  | 'created'
  | 'confirmed'
  | 'cancelled'
  | 'completed'
  | 'no_show_marked'
  | 'no_show_waived'
  | 'rescheduled'
  | 'refunded'
  | 'payment_recorded'
  | 'checked_in'
  | 'notes_updated'
  | 'recurring_generated'
  | 'payment_failed'
  | 'status_changed';

/**
 * BookingLogEntity — immutable audit log.
 * INSERT only. No UPDATE, no soft-delete, no deletedAt.
 */
@Entity('booking_logs')
@Index(['tenantId', 'bookingId'])
@Index(['tenantId', 'action'])
@Index(['tenantId', 'actorId'])
@Index(['tenantId', 'createdAt'])
export class BookingLogEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: false })
  bookingId!: string;

  @Column({
    type: 'enum',
    enum: [
      'created', 'confirmed', 'cancelled', 'completed',
      'no_show_marked', 'no_show_waived', 'rescheduled', 'refunded',
      'payment_recorded', 'checked_in', 'notes_updated',
      'recurring_generated', 'status_changed',
    ],
  })
  action!: BookingLogAction;

  @Column({ name: 'actor_id', type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ name: 'actor_type', type: 'varchar', length: 30, nullable: true })
  actorType!: 'user' | 'admin' | 'system' | null;

  @Column({ name: 'previous_status', type: 'varchar', length: 50, nullable: true })
  previousStatus!: string | null;

  @Column({ name: 'new_status', type: 'varchar', length: 50, nullable: true })
  newStatus!: string | null;

  /**
   * JSON diff of changed fields.
   * Sensitive fields (card numbers, CVV) must be masked before insertion.
   */
  @Column({ type: 'jsonb', nullable: true })
  diff!: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
