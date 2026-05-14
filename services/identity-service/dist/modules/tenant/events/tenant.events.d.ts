/**
 * Tenant domain event constants and payload interfaces.
 * Aligns with EventRegistry in @spancle/event-contracts.
 */
export declare enum TenantEventNames {
    CREATED = "spancle.tenant.created",
    UPDATED = "spancle.tenant.updated",
    ACTIVATED = "spancle.tenant.activated",
    SUSPENDED = "spancle.tenant.suspended",
    TERMINATED = "spancle.tenant.terminated",
    TIER_CHANGED = "spancle.tenant.tier_changed"
}
export interface TenantCreatedPayload {
    tenantId: string;
    name: string;
    slug: string;
    tier: string;
    ownerEmail: string;
    timestamp: string;
}
export interface TenantStatusChangedPayload {
    tenantId: string;
    newStatus: string;
    actorId: string;
    reason?: string;
    timestamp: string;
}
export interface TenantTierChangedPayload {
    tenantId: string;
    previousTier: string;
    newTier: string;
    actorId: string;
    timestamp: string;
}
export interface TenantUpdatedPayload {
    tenantId: string;
    timestamp: string;
}
//# sourceMappingURL=tenant.events.d.ts.map