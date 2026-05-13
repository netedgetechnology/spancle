import {
  Column, CreateDateColumn, DeleteDateColumn, Entity,
  Index, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'card' | 'cash' | 'bank_transfer' | 'voucher' | 'free';

@Entity('booking_payments')
@Index(['tenantId', 'bookingId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'providerPaymentId'])
@Index(['tenantId', 'idempotencyKey'], { unique: true })
@Index(['tenantId', 'isDeleted'])
export class BookingPaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  @Column({ name: 'branch_id', type: 'uuid', nullable: false })
  branchId!: string;

  @Column({ name: 'booking_id', type: 'uuid', nullable: false })
  bookingId!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending',
  })
  status!: PaymentStatus;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: ['card', 'cash', 'bank_transfer', 'voucher', 'free'],
    default: 'card',
  })
  paymentMethod!: PaymentMethod;

  @Column({ name: 'amount_minor', type: 'int', nullable: false })
  amountMinor!: number;

  @Column({ name: 'amount_refunded_minor', type: 'int', default: 0 })
  amountRefundedMinor!: number;

  @Column({ type: 'varchar', length: 3, default: 'GBP' })
  currency!: string;

  @Column({ name: 'provider', type: 'varchar', length: 50, nullable: true })
  provider!: string | null;

  @Column({ name: 'provider_payment_id', type: 'varchar', length: 255, nullable: true })
  providerPaymentId!: string | null;

  @Column({ name: 'provider_receipt_url', type: 'varchar', length: 2048, nullable: true })
  providerReceiptUrl!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, nullable: false })
  idempotencyKey!: string;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'failure_reason', type: 'varchar', length: 500, nullable: true })
  failureReason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById!: string | null;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}
