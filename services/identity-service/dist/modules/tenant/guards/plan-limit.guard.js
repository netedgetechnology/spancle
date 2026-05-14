"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PlanLimitGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanLimitGuard = exports.RequiresTier = exports.RequiresFeature = exports.REQUIRED_TIER_KEY = exports.REQUIRED_FEATURE_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const tenant_context_types_1 = require("../types/tenant-context.types");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
// ── Metadata keys ──────────────────────────────────────────────────────────────
exports.REQUIRED_FEATURE_KEY = 'spancle:required_feature';
exports.REQUIRED_TIER_KEY = 'spancle:required_tier';
// ── Tier hierarchy ─────────────────────────────────────────────────────────────
const TIER_RANK = {
    free: 0,
    starter: 1,
    growth: 2,
    pro: 3,
    enterprise: 4,
};
// ── Decorators ─────────────────────────────────────────────────────────────────
/**
 * @RequiresFeature('apiAccess') — route is only accessible if the tenant's
 * plan includes the named feature flag.
 *
 * Usage:
 *   @RequiresFeature('advancedAnalytics')
 *   @Get('analytics/advanced')
 *   getAdvancedAnalytics() { ... }
 */
const RequiresFeature = (feature) => (0, common_1.SetMetadata)(exports.REQUIRED_FEATURE_KEY, feature);
exports.RequiresFeature = RequiresFeature;
/**
 * @RequiresTier('pro') — route requires the tenant to be on at least
 * the specified tier (or higher).
 *
 * Usage:
 *   @RequiresTier('growth')
 *   @Post('webhooks')
 *   createWebhook() { ... }
 */
const RequiresTier = (tier) => (0, common_1.SetMetadata)(exports.REQUIRED_TIER_KEY, tier);
exports.RequiresTier = RequiresTier;
// ── Guard ──────────────────────────────────────────────────────────────────────
/**
 * PlanLimitGuard — enforces plan-based access restrictions.
 *
 * Evaluates two types of restrictions:
 *   1. @RequiresFeature() — boolean feature flag check against plan
 *   2. @RequiresTier()    — minimum tier check using TIER_RANK hierarchy
 *
 * Both checks are OR'd per decorator but AND'd across multiple decorators.
 *
 * Execution position: after TenantStatusGuard, before RolesGuard.
 *
 * When a tenant is denied:
 *   - 403 Forbidden with a clear upgrade message
 *   - Event emitted for analytics (Sprint 3 — upsell tracking)
 */
let PlanLimitGuard = PlanLimitGuard_1 = class PlanLimitGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(PlanLimitGuard_1.name);
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic)
            return true;
        const request = context
            .switchToHttp()
            .getRequest();
        const runtime = request[tenant_context_types_1.TENANT_RUNTIME_KEY];
        // No runtime context — let other guards handle
        if (!runtime)
            return true;
        // ── Feature flag check ───────────────────────────────────────────────────
        const requiredFeature = this.reflector.getAllAndOverride(exports.REQUIRED_FEATURE_KEY, [context.getHandler(), context.getClass()]);
        if (requiredFeature) {
            const hasFeature = (0, tenant_context_types_1.tenantHasFeature)(runtime, requiredFeature);
            if (!hasFeature) {
                this.logger.warn(`Plan restriction — feature "${requiredFeature}" not available on ` +
                    `tier "${runtime.tier}" for tenant ${runtime.tenantId}`);
                throw new common_1.ForbiddenException(`This feature requires a higher plan. ` +
                    `Current plan: ${runtime.tier}. ` +
                    `Please upgrade to access "${String(requiredFeature)}".`);
            }
        }
        // ── Minimum tier check ───────────────────────────────────────────────────
        const requiredTier = this.reflector.getAllAndOverride(exports.REQUIRED_TIER_KEY, [context.getHandler(), context.getClass()]);
        if (requiredTier) {
            const tenantRank = TIER_RANK[runtime.tier] ?? 0;
            const requiredRank = TIER_RANK[requiredTier] ?? 0;
            if (tenantRank < requiredRank) {
                this.logger.warn(`Plan restriction — tier "${requiredTier}" required, ` +
                    `tenant "${runtime.tenantId}" is on "${runtime.tier}"`);
                throw new common_1.ForbiddenException(`This feature requires the "${requiredTier}" plan or higher. ` +
                    `Your current plan is "${runtime.tier}". Please upgrade to continue.`);
            }
        }
        return true;
    }
};
exports.PlanLimitGuard = PlanLimitGuard;
exports.PlanLimitGuard = PlanLimitGuard = PlanLimitGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], PlanLimitGuard);
//# sourceMappingURL=plan-limit.guard.js.map