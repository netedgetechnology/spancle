import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacEngine } from '@spancle/auth-sdk';
import type { Permission } from '@spancle/types';
import { PERMISSIONS_KEY, IS_PUBLIC_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../modules/auth/types/auth-request.types';

/**
 * PermissionsGuard — enforces @RequirePermissions() metadata.
 *
 * Execution position: after RolesGuard.
 *
 * Behaviour:
 *   - @Public()                               → always passes
 *   - No @RequirePermissions()                → passes
 *   - @RequirePermissions({resource, action}) → ALL listed permissions must be satisfied
 *   - SUPER_ADMIN                             → always passes (RbacEngine wildcard)
 *
 * Differs from RolesGuard:
 *   - RolesGuard checks WHAT role a user has
 *   - PermissionsGuard checks WHAT they can do with it
 *   Both can coexist on the same endpoint.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<
      Array<Pick<Permission, 'resource' | 'action' | 'scope'>>
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const { user } = request;

    if (!user) {
      this.logger.error('PermissionsGuard reached without an authenticated user');
      throw new ForbiddenException('Insufficient permissions');
    }

    const rbacContext = {
      userId:   user.userId,
      tenantId: user.tenantId,
      role:     user.role,
    };

    // ALL required permissions must pass — AND semantics
    for (const permission of requiredPermissions) {
      const result = RbacEngine.evaluate(rbacContext, permission);

      if (result.decision === 'deny') {
        this.logger.warn(
          `Permission denial — userId: ${user.userId} tenantId: ${user.tenantId} ` +
          `role: "${user.role}" required: ${permission.resource}.${permission.action} ` +
          `reason: "${result.reason}" path: ${request.path}`,
        );
        throw new ForbiddenException(
          `Missing permission: ${permission.resource}:${permission.action}`,
        );
      }
    }

    return true;
  }
}
