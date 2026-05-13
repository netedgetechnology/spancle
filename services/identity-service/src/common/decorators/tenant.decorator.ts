import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface TenantContext {
  tenantId: string;
}

/**
 * Extracts resolved tenant context from the request object.
 * TenantGuard must run before any controller using this decorator.
 *
 * Usage: @TenantCtx() tenant: TenantContext
 */
export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest<Request & { tenant: TenantContext }>();
    return request.tenant;
  },
);
