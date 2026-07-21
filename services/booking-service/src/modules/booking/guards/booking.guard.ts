import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector }    from '@nestjs/core';
import { JwtService }   from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtPayloadSchema } from '@spancle/types';
import { ROLES_KEY, IS_PUBLIC_KEY } from '../../../common/decorators/roles.decorator';
import type { TenantContext }       from '../../../common/decorators/tenant.decorator';
import type { BookingActorContext } from '../../../common/decorators/current-user.decorator';

interface RequestWithContext extends Request {
  tenant?: TenantContext;
  actor?:  BookingActorContext;
  headers: Record<string, string | string[] | undefined>;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TENANT_HEADER = 'x-tenant-id';

/**
 * TenantGuard — validates x-tenant-id header and attaches tenant context.
 * Unchanged from original.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  canActivate(ctx: ExecutionContext): boolean {
    const req      = ctx.switchToHttp().getRequest<RequestWithContext>();
    const tenantId = req.headers[TENANT_HEADER];

    if (!tenantId || typeof tenantId !== 'string' || !UUID_RE.test(tenantId)) {
      this.logger.warn(`Missing/invalid tenant header — ip=${req.ip ?? 'unknown'}`);
      throw new UnauthorizedException('Valid x-tenant-id header required');
    }

    req.tenant = { tenantId };
    return true;
  }
}

/**
 * RbacGuard — validates Authorization: Bearer JWT and enforces RBAC.
 *
 * Validates the JWT directly using the same JWT_SECRET as identity-service.
 * Sets req.actor from the verified payload.
 *
 * Public routes (@Public()) bypass JWT validation entirely.
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector:     Reflector,
    private readonly jwtService:    JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithContext>();

    const authHeader = req.headers['authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Missing Authorization header — path=${req.path}`);
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.slice('Bearer '.length).trim();

    let payload: ReturnType<typeof JwtPayloadSchema.parse>;
    try {
      const raw = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER', 'spancle-sports-os'),
      });
      const result = JwtPayloadSchema.safeParse(raw);
      if (!result.success) {
        throw new UnauthorizedException('Malformed token payload');
      }
      payload = result.data;
    } catch (err) {
      const reason =
        err instanceof Error && err.name === 'TokenExpiredError'   ? 'Access token expired'  :
        err instanceof Error && err.name === 'JsonWebTokenError'   ? 'Invalid access token'  :
        err instanceof UnauthorizedException                        ? err.message             :
        'Authentication required';
      this.logger.warn(`Auth failed — reason="${reason}" path=${req.path}`);
      throw new UnauthorizedException(reason);
    }

    req.actor = {
      actorId:  payload.sub,
      tenantId: req.tenant?.tenantId ?? payload.tenantId,
      role:     payload.role,
      userId:   (payload as Record<string, unknown>)['userId'] as string ?? null,
    };

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (payload.role === 'SUPER_ADMIN') return true;

    if (!requiredRoles.includes(payload.role)) {
      this.logger.warn(
        `Access denied — actor=${payload.sub} role=${payload.role} required=[${requiredRoles.join(',')}]`,
      );
      throw new ForbiddenException(
        `Required role: ${requiredRoles.join(' or ')}. Your role: ${payload.role}`,
      );
    }

    return true;
  }
}
