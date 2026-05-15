"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TENANT_RUNTIME_KEY = void 0;
exports.createTenantContextRuntime = createTenantContextRuntime;
exports.tenantHasFeature = tenantHasFeature;
exports.tenantWithinLimit = tenantWithinLimit;
exports.isTenantActive = isTenantActive;
exports.isTenantSuspended = isTenantSuspended;
exports.isTenantTerminated = isTenantTerminated;
exports.TENANT_RUNTIME_KEY = Symbol('spancle:tenant_runtime');
function createTenantContextRuntime(params) {
    const runtime = {
        ...params,
        resolvedAt: params.resolvedAt ?? new Date(),
    };
    return Object.freeze(runtime);
}
function tenantHasFeature(ctx, feature) {
    return ctx.planLimits.features[feature] === true;
}
function tenantWithinLimit(ctx, resource, currentCount) {
    const limit = ctx.planLimits.resources[resource];
    if (limit === -1)
        return true;
    return currentCount < limit;
}
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