import { Injectable, type NestMiddleware, Logger, UnauthorizedException } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import { TenantContext } from '@spancle/auth-sdk';
import { TENANT_HEADER } from '@spancle/constants';
import type { TenantRequest } from '../../modules/auth/types/auth-request.types';

/**
 * TenantContextMiddleware — NestJS middleware counterpart to TenantGuard.
 *
 * Guards run per-route; middleware runs globally on the request pipeline.
 * This middleware makes TenantContext available to any service that needs
 * it without requiring guard injection — particularly useful for:
 *   - Logging interceptors that need tenantId before guard execution
 *   - Health check endpoints that should still log tenant context
 *   - Middleware-level rate limiting keyed by tenant
 *
 * When applied globally in AppModule, it populates request.tenant
 * even before the guard chain runs. TenantGuard then validates + re-sets
 * it to ensure guards remain the security boundary.
 *
 * Registration (AppModule):
 *   configure(consumer: MiddlewareConsumer): void {
 *     consumer.apply(TenantContextMiddleware).forRoutes('*');
 *   }
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  private readonly tenantHeader: string =
    process.env['TENANT_HEADER'] ?? TENANT_HEADER;

  private readonly uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  use(request: TenantRequest, _response: Response, next: NextFunction): void {
    const tenantId = request.headers[this.tenantHeader];

    if (tenantId && typeof tenantId === 'string' && this.uuidPattern.test(tenantId)) {
      try {
        request.tenant = TenantContext.fromRequest({ tenantId });
      } catch (err) {
        this.logger.warn(
          `Failed to construct TenantContext for "${tenantId}": ${String(err)}`,
        );
      }
    }

    next();
  }
}
