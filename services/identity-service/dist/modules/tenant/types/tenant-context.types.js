"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_RUNTIME_KEY = void 0;
exports.createTenantContextRuntime = createTenantContextRuntime;
exports.tenantHasFeature = tenantHasFeature;
exports.tenantWithinLimit = tenantWithinLimit;
exports.isTenantActive = isTenantActive;
exports.isTenantSuspended = isTenantSuspended;
exports.isTenantTerminated = isTenantTerminated;
/**
 * Symbol used to attach TenantContextRuntime to the Express request object.
 * Using a Symbol prevents key collision with other middleware.
 */
exports.TENANT_RUNTIME_KEY = Symbol('spancle:tenant_runtime');
/**
 * Factory — creates a frozen TenantContextRuntime.
 */
function createTenantContextRuntime(params) {
    const runtime = {
        ...params,
        resolvedAt: params.resolvedAt ?? new Date(),
    };
    return Object.freeze(runtime);
}
/**
 * Feature gate check — returns true if the tenant's plan includes a feature.
 */
function tenantHasFeature(ctx, feature) {
    return ctx.planLimits.features[feature] === true;
}
/**
 * Resource limit check — returns true if the tenant is within their limit
 * for the given resource. Treats -1 as unlimited.
 */
function tenantWithinLimit(ctx, resource, currentCount) {
    const limit = ctx.planLimits.resources[resource];
    if (limit === -1)
        return true; // Unlimited (Enterprise)
    return currentCount < limit;
}
/**
 * Status helpers
 */
function isTenantActive(ctx) {
    return ctx.status === 'active' || ctx.status === 'trial';
}
function isTenantSuspended(ctx) {
    return ctx.status === 'suspended';
}
function isTenantTerminated(ctx) {
    return ctx.status === 'terminated';
}
//# sourceMappingURL=tenant-context.types.js.map