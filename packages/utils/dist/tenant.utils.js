"use strict";
/**
 * Tenant utility helpers — used by both backend services and frontend apps.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTenantSlug = extractTenantSlug;
exports.tenantRedisKey = tenantRedisKey;
exports.hasTenantId = hasTenantId;
/**
 * Extracts tenant slug from a hostname.
 * acme.app.spancle.io -> 'acme'
 * app.spancle.io -> null
 */
function extractTenantSlug(hostname, baseDomain) {
    const withoutBase = hostname.replace(`.${baseDomain}`, '');
    if (withoutBase === hostname)
        return null; // no subdomain match
    if (withoutBase === 'www')
        return null;
    return withoutBase;
}
/**
 * Builds a tenant-namespaced Redis key.
 * Pattern: spancle:{tenantId}:{domain}:{id}
 */
function tenantRedisKey(tenantId, domain, id) {
    return `spancle:${tenantId}:${domain}:${id}`;
}
/**
 * Type guard — asserts tenantId is present on a request-like object.
 */
function hasTenantId(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'tenantId' in obj &&
        typeof obj['tenantId'] === 'string');
}
//# sourceMappingURL=tenant.utils.js.map