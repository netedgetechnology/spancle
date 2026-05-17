import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * JwtAuthGuard — saas-platform-service.
 *
 * Reads actor identity from headers set by the API gateway (nginx) after
 * JWT validation in the identity-service:
 *   x-actor-id   — authenticated user UUID
 *   x-actor-role — system role string
 *
 * Routes marked @Public() bypass this guard entirely.
 * Authenticated user is attached to request.actor for downstream use.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<
      Request & { actor?: { actorId: string; role: string } }
    >();

    const actorId = req.headers['x-actor-id'];
    const role    = req.headers['x-actor-role'];

    if (!actorId || typeof actorId !== 'string' || !UUID_RE.test(actorId)) {
      this.logger.warn(`Unauthenticated request to ${req.path} — missing or invalid x-actor-id`);
      throw new UnauthorizedException('Authentication required');
    }

    req.actor = {
      actorId,
      role: typeof role === 'string' ? role : 'VIEWER',
    };

    return true;
  }
}
