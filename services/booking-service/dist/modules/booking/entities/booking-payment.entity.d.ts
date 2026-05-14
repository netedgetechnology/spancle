export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type PaymentMethod = 'card' | 'cash' | 'bank_transfer' | 'voucher' | 'free';
export declare class BookingPaymentEntity {
    id: string;
    tenantId: string;
    branchId: string;
    bookingId: string;
    status: PaymentStatus;
    paymentMethod: PaymentMethod;
    amountMinor: number;
    amountRefundedMinor: number;
    currency: string;
    provider: string | null;
    providerPaymentId: string | null;
    providerReceiptUrl: string | null;
    idempotencyKey: string;
    paidAt: Date | null;
    failedAt: Date | null;
    failureReason: string | null;
    metadata: Record<string, unknown> | null;
    createdById: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=booking-payment.entity.d.ts.map