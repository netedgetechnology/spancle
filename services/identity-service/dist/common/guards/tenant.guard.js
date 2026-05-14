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
var TenantGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_sdk_1 = require("@spancle/auth-sdk");
const constants_1 = require("@spancle/constants");
const roles_decorator_1 = require("../decorators/roles.decorator");
/**
 * TenantGuard — first guard in the chain on every controller.
 *
 * Responsibilities:
 *   1. Reads `x-tenant-id` header (configurable via TENANT_HEADER env var)
 *   2. Validates it is a well-formed UUID
 *   3. Constructs a TenantContext and attaches it to request.tenant
 *
 * Throws 401 (not 400) — avoids leaking tenant resolution logic to clients.
 * Returns 401 on @Public() routes too if tenant header is present but malformed.
 * Returns early (passes) if @Public() and no tenant header provided.
 */
let TenantGuard = TenantGuard_1 = class TenantGuard {
    constructor(reflector) {
        this.reflector = reflector;
        this.logger = new common_1.Logger(TenantGuard_1.name);
        this.tenantHeader = process.env['TENANT_HEADER'] ?? constants_1.TENANT_HEADER;
        this.uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(roles_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        const request = context
            .switchToHttp()
            .getRequest();
        const tenantId = request.headers[this.tenantHeader];
        // Public route with no tenant header — allow through without tenant context
        if (isPublic && !tenantId) {
            return true;
        }
        // Tenant header missing on protected route
        if (!tenantId || typeof tenantId !== 'string') {
            this.logger.warn(`Missing [${this.tenantHeader}] header — ip: ${request.ip ?? 'unknown'} path: ${request.path}`);
            throw new common_1.UnauthorizedException('Tenant context is required');
        }
        // Tenant ID format validation — prevents header injection attacks
        if (!this.uuidPattern.test(tenantId)) {
            this.logger.warn(`Malformed tenant ID "${tenantId}" — ip: ${request.ip ?? 'unknown'}`);
            throw new common_1.UnauthorizedException('Invalid tenant context');
        }
        request.tenant = auth_sdk_1.TenantContext.fromRequest({ tenantId });
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = TenantGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], TenantGuard);
//# sourceMappingURL=tenant.guard.js.map