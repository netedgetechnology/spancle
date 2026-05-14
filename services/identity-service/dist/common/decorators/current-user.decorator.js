"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = void 0;
const common_1 = require("@nestjs/common");
/**
 * @CurrentUser() — extracts the validated JWT payload from the request.
 *
 * Requires JwtAuthGuard to have run before the controller method.
 * Throws 401 if no user found — guards should prevent this in practice.
 *
 * Usage:
 *   @Get('me')
 *   @UseGuards(JwtAuthGuard)
 *   getMe(@CurrentUser() user: JwtPayload) { ... }
 *
 * Usage (specific field):
 *   @Get('me')
 *   getMe(@CurrentUser('userId') userId: string) { ... }
 */
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