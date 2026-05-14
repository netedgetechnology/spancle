export type RefundStatus = 'pending' | 'processed' | 'failed' | 'rejected';
export type RefundReason = 'customer_cancellation' | 'admin_cancellation' | 'no_show_waiver' | 'reschedule' | 'system_error' | 'other';
export declare class BookingRefundEntity {
    id: string;
    tenantId: string;
    branchId: string;
    bookingId: string;
    paymentId: string;
    status: RefundStatus;
    reason: RefundReason;
    amountMinor: number;
    currency: string;
    reasonNotes: string | null;
    providerRefundId: string | null;
    processedAt: Date | null;
    failedAt: Date | null;
    failureReason: string | null;
    metadata: Record<string, unknown> | null;
    createdById: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=booking-refund.entity.d.ts.map