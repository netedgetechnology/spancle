"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TenantGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantGuard = void 0;
const common_1 = require("@nestjs/common");
let TenantGuard = TenantGuard_1 = class TenantGuard {
    constructor() {
        this.logger = new common_1.Logger(TenantGuard_1.name);
        this.tenantHeader = process.env['TENANT_HEADER'] ?? 'x-tenant-id';
    }
    canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        const tenantId = request.headers[this.tenantHeader];
        if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
            this.logger.warn(`Missing tenant header [${this.tenantHeader}] from ${request.ip ?? 'unknown'}`);
            throw new common_1.UnauthorizedException('Tenant context required');
        }
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(tenantId)) {
            this.logger.warn(`Invalid tenant ID format: ${tenantId}`);
            throw new common_1.UnauthorizedException('Invalid tenant context');
        }
        request.tenant = { tenantId };
        return true;
    }
};
exports.TenantGuard = TenantGuard;
exports.TenantGuard = TenantGuard = TenantGuard_1 = __decorate([
    (0, common_1.Injectable)()
], TenantGuard);
//# sourceMappingURL=identity.guard.js.map