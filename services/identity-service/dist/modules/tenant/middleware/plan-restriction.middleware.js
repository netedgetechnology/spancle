"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var PlanRestrictionMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanRestrictionMiddleware = void 0;
const common_1 = require("@nestjs/common");
const tenant_context_types_1 = require("../types/tenant-context.types");
/**
 * PlanRestrictionMiddleware — resource-level plan limit enforcement.
 *
 * This middleware intercepts POST (create) requests to resource endpoints
 * and checks whether the tenant has headroom in their plan before allowing
 * the request to reach the controller and incur database writes.
 *
 * Motivation: Guards run after routing resolution but before controller.
 * Middleware runs before guards. For expensive resource creation operations
 * (e.g. creating a user, booking, tournament), we want to fail fast at the
 * middleware layer with a plan-limit error rather than wasting DB round-trips.
 *
 * Route → resource mapping:
 *   POST /api/v1/users            → maxUsers
 *   POST /api/v1/academies        → maxAcademies
 *   POST /api/v1/bookings         → maxConcurrentBookings (checked against Redis counter)
 *   POST /api/v1/tournaments      → maxActiveTournaments
 *
 * Note on counting strategy:
 *   - Current counts are read from Redis atomic counters (maintained by each service)
 *   - Counter keys follow the pattern: spancle:{tenantId}:counter:{resource}
 *   - Counters are incremented on creation, decremented on soft-delete
 *   - Counters are eventually consistent — see Sprint 3 for atomic enforcement
 *
 * Sprint 3 additions:
 *   - Real-time counter reads from Redis
 *   - Atomic limit enforcement via Lua scripts
 *   - Overage grace period (10% buffer) for paid tiers
 *   - Webhook payload for upsell notifications on limit approach
 */
let PlanRestrictionMiddleware = PlanRestrictionMiddleware_1 = class PlanRestrictionMiddleware {
    constructor() {
        this.logger = new common_1.Logger(PlanRestrictionMiddleware_1.name);
        /**
         * Route → plan resource key mapping.
         * Each entry maps a URL path fragment to a PlanResourceLimits key.
         */
        this.RESOURCE_ROUTE_MAP = [
            {
                pathPattern: /^\/api\/v1\/users$/,
                method: 'POST',
                resourceKey: 'maxUsers',
                resourceName: 'users',
            },
            {
                pathPattern: /^\/api\/v1\/academies$/,
                method: 'POST',
                resourceKey: 'maxAcademies',
                resourceName: 'academies',
            },
            {
                pathPattern: /^\/api\/v1\/bookings$/,
                method: 'POST',
                resourceKey: 'maxConcurrentBookings',
                resourceName: 'concurrent bookings',
            },
            {
                pathPattern: /^\/api\/v1\/tournaments$/,
                method: 'POST',
                resourceKey: 'maxActiveTournaments',
                resourceName: 'active tournaments',
            },
        ];
    }
    use(request, _response, next) {
        const runtime = request[tenant_context_types_1.TENANT_RUNTIME_KEY];
        // No runtime — TenantResolverMiddleware not run yet or route is public infra
        if (!runtime) {
            next();
            return;
        }
        const { method, path } = request;
        // Only check on resource creation requests
        const route = this.RESOURCE_ROUTE_MAP.find((r) => r.method === method && r.pathPattern.test(path));
        if (!route) {
            next();
            return;
        }
        // Read current count — Sprint 2 TODO: read from Redis counter
        // For now: advisory check — count placeholder is 0 (always passes)
        // Replace with: await this.redisCounterService.getCount(tenantId, route.resourceKey)
        const currentCount = this.readCurrentCount(runtime.tenantId, route.resourceKey);
        const limit = runtime.planLimits.resources[route.resourceKey];
        if (!(0, tenant_context_types_1.tenantWithinLimit)(runtime, route.resourceKey, currentCount)) {
            this.logger.warn(`Plan limit reached — tenant: ${runtime.tenantId} (${runtime.tier}) ` +
                `resource: ${route.resourceKey} limit: ${limit} current: ${currentCount}`);
            throw new common_1.ForbiddenException({
                error: 'PLAN_LIMIT_EXCEEDED',
                resource: route.resourceName,
                limit,
                current: currentCount,
                tier: runtime.tier,
                message: `You have reached the ${route.resourceName} limit for your ${runtime.tier} plan. ` +
                    `Upgrade your plan to add more ${route.resourceName}.`,
                upgradeUrl: `/billing/upgrade`,
            });
        }
        // Warn if approaching limit (80% threshold)
        if (limit !== -1 && currentCount >= Math.floor(limit * 0.8)) {
            this.logger.warn(`Plan limit approaching — tenant: ${runtime.tenantId} ` +
                `resource: ${route.resourceKey} current: ${currentCount}/${limit} (${Math.round((currentCount / limit) * 100)}%)`);
            // Sprint 3: emit approaching-limit event for upsell notification
        }
        next();
    }
    /**
     * Reads the current resource count for a tenant.
     *
     * Sprint 1: returns 0 (advisory check — never blocks).
     * Sprint 2: reads from Redis atomic counter.
     * Sprint 3: atomic enforcement via Lua script.
     */
    readCurrentCount(_tenantId, _resourceKey) {
        // TODO Sprint 2: return await this.redisCounter.get(tenantId, resourceKey);
        return 0;
    }
};
exports.PlanRestrictionMiddleware = PlanRestrictionMiddleware;
exports.PlanRestrictionMiddleware = PlanRestrictionMiddleware = PlanRestrictionMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], PlanRestrictionMiddleware);
//# sourceMappingURL=plan-restriction.middleware.js.map