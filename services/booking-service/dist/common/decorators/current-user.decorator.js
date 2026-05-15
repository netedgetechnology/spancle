"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingActor = void 0;
const common_1 = require("@nestjs/common");
exports.BookingActor = (0, common_1.createParamDecorator)((field, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.actor)
        throw new common_1.UnauthorizedException('Actor context required');
    return field ? req.actor[field] : req.actor;
});
//# sourceMappingURL=current-user.decorator.js.map