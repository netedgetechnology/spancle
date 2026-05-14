import { DataSource } from 'typeorm';
import { BookingPaymentEntity } from '../entities/booking-payment.entity';
import { BookingRefundEntity } from '../entities/booking-refund.entity';
import { BookingLogEntity, type BookingLogAction } from '../entities/booking-log.entity';
export declare class BookingPaymentRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    create(data: Partial<BookingPaymentEntity>): Promise<BookingPaymentEntity>;
    findById(id: string, tenantId: string): Promise<BookingPaymentEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<BookingPaymentEntity>;
    findByBooking(bookingId: string, tenantId: string): Promise<BookingPaymentEntity[]>;
    /**
     * Returns the most recent paid payment for a booking.
     * Used by refund service to validate refund amount.
     */
    findPaidPayment(bookingId: string, tenantId: string): Promise<BookingPaymentEntity | null>;
    findByIdempotencyKey(key: string, tenantId: string): Promise<BookingPaymentEntity | null>;
    updateById(id: string, tenantId: string, data: Partial<BookingPaymentEntity>): Promise<BookingPaymentEntity>;
    sumPaidForBooking(bookingId: string, tenantId: string): Promise<number>;
}
export declare class BookingRefundRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    create(data: Partial<BookingRefundEntity>): Promise<BookingRefundEntity>;
    findById(id: string, tenantId: string): Promise<BookingRefundEntity | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<BookingRefundEntity>;
    findByBooking(bookingId: string, tenantId: string): Promise<BookingRefundEntity[]>;
    findByPayment(paymentId: string, tenantId: string): Promise<BookingRefundEntity[]>;
    sumProcessedForPayment(paymentId: string, tenantId: string): Promise<number>;
    updateById(id: string, tenantId: string, data: Partial<BookingRefundEntity>): Promise<BookingRefundEntity>;
}
export declare class BookingLogRepository {
    private readonly dataSource;
    private readonly logger;
    constructor(dataSource: DataSource);
    private get repo();
    /** INSERT only — no update or delete operations exposed */
    insert(data: {
        tenantId: string;
        bookingId: string;
        action: BookingLogAction;
        actorId?: string | null;
        actorType?: 'user' | 'admin' | 'system' | null;
        previousStatus?: string | null;
        newStatus?: string | null;
        diff?: Record<string, unknown> | null;
        note?: string | null;
        ipAddress?: string | null;
    }): Promise<BookingLogEntity>;
    findByBooking(bookingId: string, tenantId: string): Promise<BookingLogEntity[]>;
    findByAction(tenantId: string, action: BookingLogAction, from?: Date, to?: Date): Promise<BookingLogEntity[]>;
}
//# sourceMappingURL=booking-support.repository.d.ts.map