/**
 * Slot lifecycle state machine:
 *
 *   available  →  reserved   (admin hold or checkout session opened)
 *       ↓             ↓
 *    booked  ←   reserved   (payment confirmed)
 *       ↓
 *   cancelled              (customer/admin cancellation — slot freed)
 *       ↓
 *   completed              (session window has passed — terminal)
 *
 * State transitions enforced in SlotService.updateStatus().
 */
export type SlotStatus = 'available' | 'reserved' | 'booked' | 'cancelled' | 'completed' | 'unavailable';
/**
 * SlotEntity — a concrete, bookable time block on a specific court.
 *
 * Architecture decisions:
 *
 *   - Slots are stored as rows (not generated on-the-fly). This enables
 *     booking FKs, pricing snapshots, overlap DB constraints, and
 *     efficient calendar range queries.
 *
 *   - courtId is a plain UUID — no DB-level FK to courts table (which
 *     lives in identity-service, a separate DB). Referential integrity
 *     enforced at service layer via HTTP call to identity-service.
 *
 *   - resolvedPriceMinor is computed at generation time by PricingService
 *     and stored. Avoids re-computing on every availability query.
 *     Historical accuracy: price doesn't change after slot is booked.
 *
 *   - priceOverrideMinor: admin-set per-slot manual price. Always wins
 *     over resolvedPriceMinor when set. Used for promotional pricing
 *     or corrections without touching pricing rules.
 *
 *   - templateId: optional link to the SlotTemplateEntity that generated
 *     this slot. Manual (one-off) slots have templateId = null.
 *
 *   - bookingId: set when status transitions to 'booked'. The booking
 *     record lives in the bookings table (same service DB).
 *
 *   - reservedUntil: expiry timestamp for 'reserved' status. A scheduler
 *     in SlotGeneratorService auto-expires stale reservations.
 *
 * DB uniqueness: UNIQUE(tenant_id, court_id, start_at) WHERE
 *   is_deleted = false AND status != 'cancelled'
 *   This is the primary overlap prevention constraint.
 *
 * Table: slots
 */
export declare class SlotEntity {
    id: string;
    tenantId: string;
    /** FK → courts.id (identity-service) — validated at creation via HTTP */
    courtId: string;
    /** Denormalised from court for efficient branch-level queries */
    branchId: string;
    /** Denormalised from court (nullable — multi-sport courts) */
    sportId: string | null;
    /** FK → slot_templates.id — null for manually created slots */
    templateId: string | null;
    /** FK → bookings.id — set when status transitions to 'booked' */
    bookingId: string | null;
    startAt: Date;
    endAt: Date;
    /** Duration in minutes — denormalised from (endAt - startAt) for query convenience */
    durationMins: number;
    status: SlotStatus;
    /** Expiry for 'reserved' status — null for all other statuses */
    reservedUntil: Date | null;
    /**
     * Price resolved at generation time by PricingService.
     * Represents the effective price after all pricing rules applied.
     * Minor currency units (pence/cents). Null = free.
     */
    resolvedPriceMinor: number | null;
    /**
     * Manual per-slot price override — set by admin.
     * When non-null, this ALWAYS wins over resolvedPriceMinor.
     * Used for promotions or corrections without touching pricing rules.
     */
    priceOverrideMinor: number | null;
    /** ISO-4217 currency — inherited from tenant/branch at generation */
    currency: string;
    /**
     * Snapshot of the pricing rule IDs that contributed to resolvedPriceMinor.
     * Stored for audit — price justification without re-running the pipeline.
     */
    appliedRuleIds: string[] | null;
    /**
     * Human-readable label for the slot (auto-generated or admin-set).
     * e.g. "Court 1 — Monday 09:00–10:00"
     */
    label: string | null;
    /** Optional notes visible to booking admin */
    notes: string | null;
    /**
     * Maximum number of bookings this slot can carry simultaneously.
     * Default 1 (exclusive booking). >1 for shared sessions (e.g. lane swimming).
     * Mirrors court.maxBookingsConcurrent but can be overridden per slot.
     */
    maxBookings: number;
    /** How many bookings currently active on this slot */
    currentBookings: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=slot.entity.d.ts.map