export type BookingLogAction = 'created' | 'confirmed' | 'cancelled' | 'completed' | 'no_show_marked' | 'no_show_waived' | 'rescheduled' | 'refunded' | 'payment_recorded' | 'checked_in' | 'notes_updated' | 'recurring_generated' | 'payment_failed' | 'status_changed';
/**
 * BookingLogEntity — immutable audit log.
 * INSERT only. No UPDATE, no soft-delete, no deletedAt.
 */
export declare class BookingLogEntity {
    id: string;
    tenantId: string;
    bookingId: string;
    action: BookingLogAction;
    actorId: string | null;
    actorType: 'user' | 'admin' | 'system' | null;
    previousStatus: string | null;
    newStatus: string | null;
    /**
     * JSON diff of changed fields.
     * Sensitive fields (card numbers, CVV) must be masked before insertion.
     */
    diff: Record<string, unknown> | null;
    note: string | null;
    ipAddress: string | null;
    createdAt: Date;
}
//# sourceMappingURL=booking-log.entity.d.ts.map