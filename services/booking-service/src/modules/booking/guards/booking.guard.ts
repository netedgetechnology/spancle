import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../../../common/decorators/roles.decorator';
import type { TenantContext } from '../../../common/decorators/tenant.decorator';
import type { BookingActorContext } from '../../../common/decorators/current-user.decorator';

interface RequestWithContext extends Request {
  tenant?: TenantContext;
  actor?:  BookingActorContext;
  headers: Record<string, string | string[] | undefined>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * TenantGuard — validates x-tenant-id header and attaches tenant context.
 * Must run before any controller that uses @TenantCtx().
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly tenantHeader = process.env['TENANT_HEADER'] ?? 'x-tenant-id';

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<RequestWithContext>();
    const tenantId = req.headers[this.tenantHeader];

    if (!tenantId || typeof tenantId !== 'string' || !UUID_RE.test(tenantId)) {
      this.logger.warn(`Missing/invalid tenant header — ip=${req.ip ?? 'unknown'}`);
      throw new UnauthorizedException('Valid x-tenant-id header required');
    }

    req.tenant = { tenantId };
    return true;
  }
}

/**
 * RbacGuard — enforces role-based access on booking routes.
 *
 * Reads actor context from:
 *   x-actor-id   — UUID of the acting user
 *   x-actor-role — their system role (passed by API Gateway / identity-service JWT validation)
 *
 * In production, the API Gateway validates the JWT and injects these headers.
 * The booking-service trusts them (internal network only — never exposed directly).
 *
 * Public routes (decorated @Public()) bypass all role checks.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    // Check @Public() on handler or class
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req      = ctx.switchToHttp().getRequest<RequestWithContext>();
    const actorId  = req.headers['x-actor-id'];
    const actorRole = req.headers['x-actor-role'];
    const tenantId  = req.tenant?.tenantId;

    if (!actorId || typeof actorId !== 'string' || !UUID_RE.test(actorId)) {
      throw new UnauthorizedException('Authenticated actor required');
    }

    // Attach actor context for @BookingActor() decorator
    req.actor = {
      actorId,
      tenantId: tenantId ?? '',
      role:     typeof actorRole === 'string' ? actorRole : 'VIEWER',
    };

    // Check required roles for this handler/class
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const role = req.actor.role;

    // SUPER_ADMIN bypasses all role checks
    if (role === 'SUPER_ADMIN') return true;

    if (!requiredRoles.includes(role)) {
      this.logger.warn(
        `Access denied — actor=${actorId} role=${role} required=[${requiredRoles.join(',')}]`,
      );
      throw new ForbiddenException(
        `Required role: ${requiredRoles.join(' or ')}. Your role: ${role}`,
      );
    }

    return true;
  }
}
