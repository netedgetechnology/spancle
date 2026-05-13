import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';

/**
 * SuperAdminGuard — restricts access to SUPER_ADMIN role only.
 *
 * Applied at controller class level for all admin stats endpoints.
 * This is a defence-in-depth guard — the global RolesGuard also enforces
 * role checks, but this guard makes the SUPER_ADMIN requirement explicit
 * at the module level, independently of the global guard chain.
 *
 * Execution position: after JwtAuthGuard (requires request.user).
 *
 * Returns:
 *   - 401 if no authenticated user on the request
 *   - 403 if authenticated but not SUPER_ADMIN
 *   - passes if role === 'SUPER_ADMIN'
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { role?: string; userId?: string; tenantId?: string };
      path:  string;
    }>();

    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (request.user.role !== 'SUPER_ADMIN') {
      this.logger.warn(
        `SuperAdmin access denied — userId: ${request.user.userId} ` +
        `role: "${request.user.role}" path: ${request.path}`,
      );
      throw new ForbiddenException(
        'This endpoint requires SUPER_ADMIN role',
      );
    }

    return true;
  }
}
