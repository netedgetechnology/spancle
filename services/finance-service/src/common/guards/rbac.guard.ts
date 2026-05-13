import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../decorators/roles.decorator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * RbacGuard — finance-service.
 * Reads x-actor-id and x-actor-role headers (injected by API Gateway).
 * Enforces @Roles() metadata. SUPER_ADMIN bypasses all checks.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req      = ctx.switchToHttp().getRequest<Request & { actor?: { actorId: string; role: string } }>();
    const actorId  = req.headers['x-actor-id'];
    const role     = req.headers['x-actor-role'];

    if (!actorId || typeof actorId !== 'string' || !UUID_RE.test(actorId)) {
      throw new UnauthorizedException('Authenticated actor required');
    }

    req.actor = {
      actorId,
      role: typeof role === 'string' ? role : 'VIEWER',
    };

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const actorRole = req.actor.role;
    if (actorRole === 'SUPER_ADMIN') return true;

    if (!requiredRoles.includes(actorRole)) {
      this.logger.warn(
        `Finance RBAC denial — actor=${actorId} role=${actorRole} ` +
        `required=[${requiredRoles.join(',')}] path=${req.path}`,
      );
      throw new ForbiddenException(
        `Required role: ${requiredRoles.join(' or ')}. Your role: ${actorRole}`,
      );
    }

    return true;
  }
}
