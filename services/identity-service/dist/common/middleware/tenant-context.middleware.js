"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TenantContextMiddleware_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContextMiddleware = void 0;
const common_1 = require("@nestjs/common");
const auth_sdk_1 = require("@spancle/auth-sdk");
const constants_1 = require("@spancle/constants");
let TenantContextMiddleware = TenantContextMiddleware_1 = class TenantContextMiddleware {
    constructor() {
        this.logger = new common_1.Logger(TenantContextMiddleware_1.name);
        this.tenantHeader = process.env['TENANT_HEADER'] ?? constants_1.TENANT_HEADER;
        this.uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    }
    use(request, _response, next) {
        const tenantId = request.headers[this.tenantHeader];
        if (tenantId && typeof tenantId === 'string' && this.uuidPattern.test(tenantId)) {
            try {
                request.tenant = auth_sdk_1.TenantContext.fromRequest({ tenantId });
            }
            catch (err) {
                this.logger.warn(`Failed to construct TenantContext for "${tenantId}": ${String(err)}`);
            }
        }
        next();
    }
};
exports.TenantContextMiddleware = TenantContextMiddleware;
exports.TenantContextMiddleware = TenantContextMiddleware = TenantContextMiddleware_1 = __decorate([
    (0, common_1.Injectable)()
], TenantContextMiddleware);
//# sourceMappingURL=tenant-context.middleware.js.map