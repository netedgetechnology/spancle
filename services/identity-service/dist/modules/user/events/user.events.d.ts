/**
 * UserEvents — domain event constants for the user domain.
 * All events namespaced under spancle.user.*
 */
export declare enum UserEvents {
    CREATED = "spancle.user.created",
    UPDATED = "spancle.user.updated",
    DELETED = "spancle.user.deleted",
    STATUS_CHANGED = "spancle.user.status_changed"
}
export interface UserEventPayload {
    tenantId: string;
    userId: string;
    actorId?: string;
    timestamp?: string;
}
export interface UserStatusChangedPayload extends UserEventPayload {
    previousStatus: string;
    newStatus: string;
}
//# sourceMappingURL=user.events.d.ts.map