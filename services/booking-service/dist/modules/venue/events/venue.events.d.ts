/**
 * VenueEvents — domain event constants for the venue domain.
 * All events namespaced under spancle.venue.*
 */
export declare enum VenueEvents {
    CREATED = "spancle.venue.created",
    UPDATED = "spancle.venue.updated",
    DELETED = "spancle.venue.deleted",
    STATUS_CHANGED = "spancle.venue.status_changed"
}
export interface VenueEventPayload {
    tenantId: string;
    venueId: string;
    actorId?: string;
    timestamp?: string;
}
export interface VenueStatusChangedPayload extends VenueEventPayload {
    previousStatus: string;
    newStatus: string;
}
//# sourceMappingURL=venue.events.d.ts.map