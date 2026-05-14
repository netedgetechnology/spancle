"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_EVENT_SCHEMAS = exports.TenantTierChangedPayloadSchema = exports.TenantStatusChangedPayloadSchema = exports.TenantCreatedPayloadSchema = void 0;
const zod_1 = require("zod");
const event_registry_1 = require("../core/event-registry");
const BaseTenantPayload = zod_1.z.object({
    tenantId: zod_1.z.string().uuid(),
    actorId: zod_1.z.string().uuid().optional(),
});
exports.TenantCreatedPayloadSchema = BaseTenantPayload.extend({
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    tier: zod_1.z.string(),
    ownerEmail: zod_1.z.string().email(),
});
exports.TenantStatusChangedPayloadSchema = BaseTenantPayload.extend({
    previousStatus: zod_1.z.string(),
    newStatus: zod_1.z.string(),
    reason: zod_1.z.string().optional(),
});
exports.TenantTierChangedPayloadSchema = BaseTenantPayload.extend({
    previousTier: zod_1.z.string(),
    newTier: zod_1.z.string(),
    effectiveAt: zod_1.z.string().datetime().optional(),
});
exports.TENANT_EVENT_SCHEMAS = {
    [event_registry_1.EventRegistry.TENANT_CREATED]: exports.TenantCreatedPayloadSchema,
    [event_registry_1.EventRegistry.TENANT_ACTIVATED]: exports.TenantStatusChangedPayloadSchema,
    [event_registry_1.EventRegistry.TENANT_SUSPENDED]: exports.TenantStatusChangedPayloadSchema,
    [event_registry_1.EventRegistry.TENANT_TERMINATED]: exports.TenantStatusChangedPayloadSchema,
    [event_registry_1.EventRegistry.TENANT_TIER_CHANGED]: exports.TenantTierChangedPayloadSchema,
};
//# sourceMappingURL=tenant.events.js.map