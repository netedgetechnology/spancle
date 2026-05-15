import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface TenantContext {
  tenantId: string;
}

export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<
      Request & { tenant?: TenantContext; tenantId?: string }
    >();

    // Primary: set by TenantGuard middleware
    if (request.tenant?.tenantId) return request.tenant;

    // Fallback 1: tenantId set directly on request
    if (request.tenantId) return { tenantId: request.tenantId };

    // Fallback 2: x-tenant-id header (public endpoints bypass TenantGuard)
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && typeof headerTenantId === 'string') {
      return { tenantId: headerTenantId };
    }

    // Return empty string tenantId — controller/service must validate
    return { tenantId: '' };
  },
);
