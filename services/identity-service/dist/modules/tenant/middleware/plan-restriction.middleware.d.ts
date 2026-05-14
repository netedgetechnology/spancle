import { type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { type TenantRuntimeRequest } from '../types/tenant-context.types';
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
export declare class PlanRestrictionMiddleware implements NestMiddleware {
    private readonly logger;
    /**
     * Route → plan resource key mapping.
     * Each entry maps a URL path fragment to a PlanResourceLimits key.
     */
    private readonly RESOURCE_ROUTE_MAP;
    use(request: Request & TenantRuntimeRequest, _response: Response, next: NextFunction): void;
    /**
     * Reads the current resource count for a tenant.
     *
     * Sprint 1: returns 0 (advisory check — never blocks).
     * Sprint 2: reads from Redis atomic counter.
     * Sprint 3: atomic enforcement via Lua script.
     */
    private readCurrentCount;
}
//# sourceMappingURL=plan-restriction.middleware.d.ts.map