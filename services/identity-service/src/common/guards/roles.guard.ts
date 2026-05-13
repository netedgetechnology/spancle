import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacEngine } from '@spancle/auth-sdk';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../modules/auth/types/auth-request.types';

/**
 * RolesGuard — enforces @Roles() metadata using the stateless RbacEngine.
 *
 * Execution position: after JwtAuthGuard (requires request.user to be populated).
 *
 * Behaviour:
 *   - @Public()          → always passes
 *   - No @Roles()        → passes (any authenticated user)
 *   - @Roles('X', 'Y')  → passes if user.role is X or Y
 *   - SUPER_ADMIN        → always passes (wildcard — handled by RbacEngine)
 *
 * Emits a structured log on denial — feeds into the audit pipeline.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — any authenticated user is permitted
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const { user } = request;

    // Treat absence of user as a guard ordering bug — should not reach here
    if (!user) {
      this.logger.error('RolesGuard reached without an authenticated user — check guard ordering');
      throw new ForbiddenException('Insufficient permissions');
    }

    const rbacContext = {
      userId:   user.userId,
      tenantId: user.tenantId,
      role:     user.role,
    };

    const hasRole = RbacEngine.hasRole(rbacContext, requiredRoles);

    if (!hasRole) {
      this.logger.warn(
        `RBAC denial — userId: ${user.userId} tenantId: ${user.tenantId} ` +
        `role: "${user.role}" required: [${requiredRoles.join(', ')}] ` +
        `path: ${request.path}`,
      );
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
