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
export declare const CurrentUser: (...dataOrPipes: (import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | "sub" | "userId" | "tenantId" | "role" | "iat" | "exp" | "iss" | "jti" | undefined)[]) => ParameterDecorator;
//# sourceMappingURL=current-user.decorator.d.ts.map