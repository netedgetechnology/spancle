/**
 * Booking lifecycle:
 *
 *   pending_payment → confirmed  (payment received)
 *   pending_payment → cancelled  (payment timed out or manually cancelled)
 *   confirmed       → completed  (session window has passed)
 *   confirmed       → cancelled  (admin or customer cancellation)
 *   confirmed       → no_show    (customer did not attend — post-session)
 *   cancelled       → refunded   (refund processed; terminal)
 *
 * State transitions are enforced in BookingService.updateStatus().
 * Every transition writes an immutable BookingLogEntity row.
 */
export type BookingStatus = 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show' | 'refunded';
/**
 * Where the booking originated.
 * Used for reporting and for conditional business rules
 * (e.g. online bookings require card payment; walk-in can be cash).
 */
export type BookingChannel = 'online' | 'admin' | 'walk_in' | 'api';
/**
 * BookingEntity — a confirmed or in-progress reservation of one or more slots.
 *
 * Architecture decisions:
 *
 *   - A booking may span multiple slots (multi-slot booking).
 *     The slot IDs are stored as JSONB array (slotIds) rather than a
 *     join table — simplifies queries for single-slot bookings (the
 *     common case) and avoids a booking_slots join table.
 *     When any slot in slotIds transitions to 'booked', it FK-references
 *     this booking's id via slots.booking_id.
 *
 *   - Customer data is denormalised onto the booking row for display
 *     without a user service lookup. It is also the source of truth for
 *     guest bookings (no user account).
 *
 *   - Pricing is snapshotted at booking time:
 *       finalPriceMinor = the total amount the customer pays / paid.
 *       It equals the sum of resolved prices for all slotIds at booking
 *       creation. Subsequent pricing rule changes do not affect it.
 *
 *   - isMember: passed through to PricingService at slot generation time
 *     so that member discounts are applied correctly to the booking total.
 *
 *   - All cross-service FKs (branchId, courtId, sportId, userId) are plain
 *     UUIDs — no DB-level FK constraints. Validated at service layer.
 *
 *   - Soft-delete is supported for GDPR erasure requests.
 *     Hard deletion is not exposed via any API.
 *
 * Table: bookings
 * Indices:
 *   (tenant_id)                    — RLS baseline
 *   (tenant_id, status)            — status filtering
 *   (tenant_id, branch_id)         — branch-level reports
 *   (tenant_id, court_id)          — court occupancy queries
 *   (tenant_id, user_id)           — customer booking history
 *   (tenant_id, reference)         — unique booking reference lookup
 *   (tenant_id, created_at)        — chronological listing
 */
export declare class BookingEntity {
    id: string;
    tenantId: string;
    /**
     * Unique booking reference — displayed to customers.
     * Format: {PREFIX}-{YYYYMMDD}-{6 random chars} e.g. "BK-20250621-X4K9QR"
     * Generated in BookingService.create() before insert.
     * Unique per tenant (UNIQUE index on tenant_id, reference).
     */
    reference: string;
    /**
     * Branch where the booking takes place.
     * Denormalised from the slot(s) for branch-level reporting.
     * FK → identity-service branches.id (validated at service layer).
     */
    branchId: string;
    /**
     * Primary court for this booking.
     * For multi-slot bookings spanning multiple courts, this is the first
     * court in slotIds order.
     * FK → identity-service courts.id (validated at service layer).
     */
    courtId: string;
    /**
     * Sport associated with this booking.
     * Nullable — multi-sport courts may not have a sport set.
     * FK → identity-service sports.id (validated at service layer).
     */
    sportId: string | null;
    /**
     * The slot(s) reserved by this booking.
     * JSONB array of slot UUIDs.
     * Ordering: ascending by startAt.
     *
     * Every slot listed here has:
     *   - slots.booking_id = this booking's id
     *   - slots.status     = 'booked' (while booking is confirmed)
     *
     * Maintained in sync by BookingService — no orphaned references.
     */
    slotIds: string[];
    /**
     * Authenticated user who made the booking.
     * Null for walk-in or admin-created bookings.
     * FK → identity-service users.id (validated at service layer).
     */
    userId: string | null;
    /** Customer full name — present for both member and guest bookings */
    customerName: string;
    /** Customer email — required for confirmation and receipt emails */
    customerEmail: string;
    /** Customer phone — optional, used for SMS reminders */
    customerPhone: string | null;
    /**
     * Whether the booker is a member of this tenant's organisation.
     * Passed to PricingService so member discount rules are applied.
     * Also used for access control on member-only slots.
     */
    isMember: boolean;
    status: BookingStatus;
    channel: BookingChannel;
    /** Earliest startAt across all slotIds — denormalised for range queries */
    startsAt: Date;
    /** Latest endAt across all slotIds — denormalised for range queries */
    endsAt: Date;
    /** Total duration in minutes across all slotIds */
    totalDurationMins: number;
    /**
     * Total price charged to the customer for this booking.
     * Minor currency units. Null = free booking.
     * Snapshotted at confirmation — not recomputed after creation.
     */
    finalPriceMinor: number | null;
    /**
     * Amount already paid (sum of successful BookingPaymentEntity rows).
     * Updated by BookingService after each payment recorded.
     * Denormalised for fast balance-due calculations.
     */
    amountPaidMinor: number;
    /**
     * Amount refunded (sum of successful BookingRefundEntity rows).
     * Updated by BookingService after each refund processed.
     */
    amountRefundedMinor: number;
    /** ISO-4217 currency code — inherited from tenant/branch settings */
    currency: string;
    /**
     * Number of participants in this booking.
     * Used for shared-session slots (maxBookings > 1) where each booking
     * represents one participant group.
     */
    participantCount: number;
    /** Customer-facing notes (visible on receipt and confirmation email) */
    customerNotes: string | null;
    /** Internal admin notes (never shown to customer) */
    internalNotes: string | null;
    /**
     * Freeform metadata for integrations.
     * e.g. external booking system reference, CRM contact ID.
     */
    metadata: Record<string, unknown> | null;
    cancelledAt: Date | null;
    /** UUID of the admin or system actor who cancelled the booking */
    cancelledById: string | null;
    cancellationReason: string | null;
    completedAt: Date | null;
    checkedInAt: Date | null;
    /** UUID of the user or system that created this booking */
    createdById: string | null;
    /** UUID of the user or system that last modified this booking */
    updatedById: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=booking.entity.d.ts.map