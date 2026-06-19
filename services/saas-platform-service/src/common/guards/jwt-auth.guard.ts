import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtPayloadSchema } from '@spancle/types';
import { IS_PUBLIC_KEY } from '../decorators/roles.decorator';

/**
 * JwtAuthGuard — saas-platform-service.
 *
 * Validates the Authorization: Bearer <JWT> header directly against
 * JWT_SECRET — the same secret used by identity-service to issue tokens.
 * No gateway or header-injection layer exists; this guard performs
 * verification in-process.
 *
 * Routes marked @Public() bypass this guard entirely.
 * On success, the verified payload is attached to request.user
 * (matches the shape expected by SuperAdminGuard and downstream guards).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector:    Reflector,
    private readonly jwtService:   JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);

    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<
      Request & { user?: { userId: string; role: string; tenantId: string } }
    >();

    const authHeader = req.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Unauthenticated request to ${req.path} — missing Authorization header`);
      throw new UnauthorizedException('Authentication required');
    }

    const token = authHeader.slice('Bearer '.length).trim();

    try {
      const rawPayload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
        issuer: this.configService.get<string>('JWT_ISSUER', 'spancle-sports-os'),
      });

      const result = JwtPayloadSchema.safeParse(rawPayload);
      if (!result.success) {
        this.logger.warn(`JWT payload failed schema validation: ${result.error.message}`);
        throw new UnauthorizedException('Malformed token payload');
      }

      const payload = result.data;

      req.user = {
        userId:   payload.sub,
        role:     payload.role,
        tenantId: payload.tenantId,
      };

      return true;
    } catch (err) {
      const reason =
        err instanceof Error && err.name === 'TokenExpiredError'
          ? 'Access token expired'
          : err instanceof Error && err.name === 'JsonWebTokenError'
            ? 'Invalid access token'
            : 'Authentication required';

      this.logger.warn(`Auth failed — reason: "${reason}" path: ${req.path}`);
      throw new UnauthorizedException(reason);
    }
  }
}
