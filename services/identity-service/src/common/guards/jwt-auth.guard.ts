import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

/**
 * JwtAuthGuard — validates the Bearer access token on every protected route.
 *
 * Extends Passport's AuthGuard('jwt') to add:
 *   1. @Public() short-circuit — skips validation for public routes
 *   2. Structured error logging with request context
 *   3. Consistent 401 error shape for all auth failures
 *
 * Execution order guarantee:
 *   TenantGuard → JwtAuthGuard → RolesGuard → PermissionsGuard → Handler
 *
 * On success: sets request.user = JwtPayload (via JwtStrategy.validate())
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  /**
   * Called by Passport after strategy validation.
   * Overridden to provide structured error responses.
   */
  override handleRequest<TUser>(
    err: Error | null,
    user: TUser | false,
    info: { message?: string; name?: string } | undefined,
    context: ExecutionContext,
  ): TUser {
    if (err ?? !user) {
      const request = context.switchToHttp().getRequest<{ path: string; ip?: string }>();

      const reason =
        info?.name === 'TokenExpiredError'
          ? 'Access token expired'
          : info?.name === 'JsonWebTokenError'
            ? 'Invalid access token'
            : info?.message ?? 'Authentication required';

      this.logger.warn(
        `Auth failed — reason: "${reason}" path: ${request.path} ip: ${request.ip ?? 'unknown'}`,
      );

      throw new UnauthorizedException(reason);
    }

    return user;
  }
}
