"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantCtx = void 0;
const common_1 = require("@nestjs/common");
/**
 * Extracts resolved tenant context from the request object.
 * TenantGuard must run before any controller using this decorator.
 *
 * Usage: @TenantCtx() tenant: TenantContext
 */
exports.TenantCtx = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.tenant;
});
//# sourceMappingURL=tenant.decorator.js.map