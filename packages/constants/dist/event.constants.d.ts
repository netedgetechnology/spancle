/**
 * Event Constants
 * Redis Pub/Sub channel patterns and event routing.
 *
 * Channel naming convention:
 *   spancle.{domain}.{entity}.{action}
 *
 * Wildcard subscriptions:
 *   spancle.*           — all platform events
 *   spancle.identity.*  — all identity events
 */
export declare const EVENT_CHANNEL_PREFIX: "spancle";
export declare const EVENT_DOMAINS: {
    readonly IDENTITY: "identity";
    readonly TENANT: "tenant";
    readonly USER: "user";
    readonly ROLE: "role";
    readonly BOOKING: "booking";
    readonly SLOT: "slot";
    readonly VENUE: "venue";
    readonly INVOICE: "invoice";
    readonly PAYMENT: "payment";
    readonly WALLET: "wallet";
    readonly TOURNAMENT: "tournament";
    readonly BRACKET: "bracket";
    readonly MATCH: "match";
    readonly ACADEMY: "academy";
    readonly PLAYER: "player";
    readonly COACH: "coach";
    readonly NOTIFICATION: "notification";
    readonly MESSAGE: "message";
    readonly REPORT: "report";
};
export type EventDomain = typeof EVENT_DOMAINS[keyof typeof EVENT_DOMAINS];
export declare const EVENT_ACTIONS: {
    readonly CREATED: "created";
    readonly UPDATED: "updated";
    readonly DELETED: "deleted";
    readonly ACTIVATED: "activated";
    readonly DEACTIVATED: "deactivated";
    readonly STATUS_CHANGED: "status_changed";
    readonly PUBLISHED: "published";
    readonly CANCELLED: "cancelled";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly SENT: "sent";
    readonly VIEWED: "viewed";
};
export type EventAction = typeof EVENT_ACTIONS[keyof typeof EVENT_ACTIONS];
/** Builds a typed event channel string */
export declare function buildEventChannel(domain: EventDomain, action: EventAction): string;
/** Builds a tenant-scoped event channel */
export declare function buildTenantEventChannel(tenantId: string, domain: EventDomain, action: EventAction): string;
//# sourceMappingURL=event.constants.d.ts.map