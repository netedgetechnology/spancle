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
let PlanRestrictionMiddleware = PlanRestrictionMiddleware_1 = class PlanRestrictionMiddleware {
    constructor() {
        this.logger = new common_1.Logger(PlanRestrictionMiddleware_1.name);
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
        if (!runtime) {
            next();
            return;
        }
        const { method, path } = request;
        const route = this.RESOURCE_ROUTE_MAP.find((r) => r.method === method && r.pathPattern.test(path));
        if (!route) {
            next();
            return;
        }
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
        if (limit !== -1 && currentCount >= Math.floor(limit * 0.8)) {
            this.logger.warn(`Plan limit approaching — tenant: ${runtime.tenantId} ` +
                `resource: ${route.resourceKey} current: ${currentCount}/${limit} (${Math.round((currentCount / limit) * 100)}%)`);
        }
        next();
    }
    readCurrentCount(_tenantId, _resourceKey) {
        return 0;
    }
};
exports.PlanRestrictionMiddleware = PlanRestrictionMiddleware;
exports.PlanRestrictionMiddleware = PlanRestrictionMiddleware = PlanRestrictionMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], PlanRestrictionMiddleware);
//# sourceMappingURL=plan-restriction.middleware.js.map