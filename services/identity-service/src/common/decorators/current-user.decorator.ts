import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from '@spancle/types';
import type { AuthenticatedRequest } from '../../modules/auth/types/auth-request.types';

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
export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext): JwtPayload | JwtPayload[keyof JwtPayload] => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.user) {
      throw new UnauthorizedException('No authenticated user found on request');
    }

    if (field) {
      return request.user[field];
    }

    return request.user;
  },
);
