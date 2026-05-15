"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
exports.CurrentUser = (0, common_1.createParamDecorator)((field, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    if (!request.user) {
        throw new common_1.UnauthorizedException('No authenticated user found on request');
    }
    if (field) {
        return request.user[field];
    }
    return request.user;
});
//# sourceMappingURL=current-user.decorator.js.map