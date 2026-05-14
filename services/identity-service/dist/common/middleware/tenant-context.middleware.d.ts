import { type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
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
export declare class TenantContextMiddleware implements NestMiddleware {
    private readonly logger;
    private readonly tenantHeader;
    private readonly uuidPattern;
    use(request: TenantRequest, _response: Response, next: NextFunction): void;
}
//# sourceMappingURL=tenant-context.middleware.d.ts.map