import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export type RefundStatus = 'pending' | 'processed' | 'failed' | 'rejected';
export type RefundReason =
  | 'customer_cancellation'
  | 'admin_cancellation'
  | 'no_show_waiver'
  | 'reschedule'
  | 'system_error'
  | 'other';

@Entity('booking_refunds')
@Index(['tenantId', 'bookingId'])
@Index(['tenantId', 'paymentId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'isDeleted'])
export class BookingRefundEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: false })
  bookingId!: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: false })
  paymentId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processed', 'failed', 'rejected'],
    default: 'pending',
  })
  status!: RefundStatus;

  @Column({
    name: 'reason',
    type: 'enum',
    enum: ['customer_cancellation', 'admin_cancellation', 'no_show_waiver', 'reschedule', 'system_error', 'other'],
    default: 'other',
  })
  reason!: RefundReason;

  @Column({ name: 'amount_minor', type: 'int', nullable: false })
  amountMinor!: number;

  @Column({ type: 'varchar', length: 3, default: 'GBP' })
  currency!: string;

  @Column({ name: 'reason_notes', type: 'varchar', length: 1000, nullable: true })
  reasonNotes!: string | null;

  @Column({ name: 'provider_refund_id', type: 'varchar', length: 255, nullable: true })
  providerRefundId!: string | null;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: false })
  createdById!: string;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
