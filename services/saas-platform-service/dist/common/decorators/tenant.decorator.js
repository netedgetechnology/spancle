"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantCtx = void 0;
const common_1 = require("@nestjs/common");
exports.TenantCtx = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    if (request.tenant?.tenantId)
        return request.tenant;
    if (request.tenantId)
        return { tenantId: request.tenantId };
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && typeof headerTenantId === 'string') {
        return { tenantId: headerTenantId };
    }
    return { tenantId: '' };
});
//# sourceMappingURL=tenant.decorator.js.map