"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingActor = void 0;
const common_1 = require("@nestjs/common");
/**
 * @BookingActor() — extracts actor context set by RbacGuard.
 * Throws 401 if no actor found on request.
 */
exports.BookingActor = (0, common_1.createParamDecorator)((field, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.actor)
        throw new common_1.UnauthorizedException('Actor context required');
    return field ? req.actor[field] : req.actor;
});
//# sourceMappingURL=current-user.decorator.js.map