import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * BookingRefundPaymentAllocationEntity
 *
 * Records exactly how a booking refund amount is allocated across
 * the individual paid BookingPaymentEntity rows for a booking.
 *
 * One row per (booking_refund_id, booking_payment_id).
 * INSERT-only — never updated or deleted.
 * SUM(amount_minor) for a given booking_refund_id always equals
 * the parent BookingRefundEntity.amountMinor.
 *
 * Table: booking_refund_payment_allocations
 */
@Entity('booking_refund_payment_allocations')
@Index(['tenantId', 'bookingRefundId'])
@Index(['tenantId', 'bookingPaymentId'])
@Index(['tenantId', 'bookingRefundId', 'bookingPaymentId'], { unique: true })
export class BookingRefundPaymentAllocationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid', nullable: false })
  @Index()
  tenantId!: string;

  /** FK-equivalent → booking_refunds.id */
  @Column({ name: 'booking_refund_id', type: 'uuid', nullable: false })
  bookingRefundId!: string;

  /** FK-equivalent → booking_payments.id */
  @Column({ name: 'booking_payment_id', type: 'uuid', nullable: false })
  bookingPaymentId!: string;

  /** Amount of the booking refund charged to this payment. INT minor units only. */
  @Column({ name: 'amount_minor', type: 'int', nullable: false })
  amountMinor!: number;

  /** INSERT-only. No updated_at. */
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
