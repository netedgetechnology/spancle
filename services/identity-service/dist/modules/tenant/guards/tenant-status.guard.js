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
var TenantStatusGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantStatusGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("../../../common/decorators/roles.decorator");
const tenant_context_types_1 = require("../types/tenant-context.types");
/**
 * TenantStatusGuard — enforces tenant lifecycle state on every request.
 *
 * Execution position: after JwtAuthGuard, before RolesGuard.
 *
 * Status rules:
 *   - active / trial  → allowed
 *   - pending         → allowed (tenant is setting up)
 *   - suspended       → 503 Service Unavailable
 *   - terminated      → 503 Service Unavailable
 *
 * Unlike TenantGuard which validates the header format,
 * TenantStatusGuard validates the tenant's BUSINESS STATUS.
 *
 * @Public() routes are allowed for all statuses EXCEPT terminated.
 * Terminated tenants cannot access even public endpoints — their
 * data is in retention and their account is closed.
 */
let TenantStatusGuard = TenantStatusGuard_1 = class TenantStatusGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(TenantStatusGuard_1.name);
    }
    canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        const runtime = request[tenant_context_types_1.TENANT_RUNTIME_KEY];
        // No runtime — TenantResolverMiddleware hasn't run or tenant wasn't resolved
        // Let downstream guards handle this case
        if (!runtime)
            return true;
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        // Terminated tenants are completely blocked — even public routes
        if ((0, tenant_context_types_1.isTenantTerminated)(runtime)) {
            this.logger.warn(`Blocked TERMINATED tenant: ${runtime.tenantId} (${runtime.slug}) — path: ${request.path}`);
            throw new common_1.ServiceUnavailableException('This account has been terminated. Please contact support.');
        }
        // Suspended tenants cannot access protected routes
        // Public routes (login, password reset) are allowed so they can resolve support issues
        if (isSuspended(runtime) && !isPublic) {
            this.logger.warn(`Blocked SUSPENDED tenant: ${runtime.tenantId} (${runtime.slug}) — path: ${request.path}`);
            throw new common_1.ServiceUnavailableException('This account has been suspended. Please contact support.');
        }
        return true;
    }
};
exports.TenantStatusGuard = TenantStatusGuard;
exports.TenantStatusGuard = TenantStatusGuard = TenantStatusGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], TenantStatusGuard);
function isSuspended(runtime) {
    return runtime.status === 'suspended';
}
//# sourceMappingURL=tenant-status.guard.js.map