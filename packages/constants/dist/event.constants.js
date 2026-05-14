"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_ACTIONS = exports.EVENT_DOMAINS = exports.EVENT_CHANNEL_PREFIX = void 0;
exports.buildEventChannel = buildEventChannel;
exports.buildTenantEventChannel = buildTenantEventChannel;
exports.EVENT_CHANNEL_PREFIX = 'spancle';
exports.EVENT_DOMAINS = {
    IDENTITY: 'identity',
    TENANT: 'tenant',
    USER: 'user',
    ROLE: 'role',
    BOOKING: 'booking',
    SLOT: 'slot',
    VENUE: 'venue',
    INVOICE: 'invoice',
    PAYMENT: 'payment',
    WALLET: 'wallet',
    TOURNAMENT: 'tournament',
    BRACKET: 'bracket',
    MATCH: 'match',
    ACADEMY: 'academy',
    PLAYER: 'player',
    COACH: 'coach',
    NOTIFICATION: 'notification',
    MESSAGE: 'message',
    REPORT: 'report',
};
exports.EVENT_ACTIONS = {
    CREATED: 'created',
    UPDATED: 'updated',
    DELETED: 'deleted',
    ACTIVATED: 'activated',
    DEACTIVATED: 'deactivated',
    STATUS_CHANGED: 'status_changed',
    PUBLISHED: 'published',
    CANCELLED: 'cancelled',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SENT: 'sent',
    VIEWED: 'viewed',
};
/** Builds a typed event channel string */
function buildEventChannel(domain, action) {
    return `${exports.EVENT_CHANNEL_PREFIX}.${domain}.${action}`;
}
/** Builds a tenant-scoped event channel */
function buildTenantEventChannel(tenantId, domain, action) {
    return `${exports.EVENT_CHANNEL_PREFIX}.${tenantId}.${domain}.${action}`;
}
//# sourceMappingURL=event.constants.js.map