import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import type { Response } from 'express';
import {
  TENANT_RUNTIME_KEY,
  type TenantRuntimeRequest,
} from '../../modules/tenant/types/tenant-context.types';

/**
 * TenantContextInterceptor — stamps tenant metadata on HTTP responses.
 *
 * Sets the following response headers on every request that has a resolved
 * TenantContextRuntime:
 *
 *   x-tenant-id:        {uuid}           — tenant identity
 *   x-tenant-slug:      {slug}           — human-readable tenant identifier
 *   x-tenant-tier:      {tier}           — plan tier for client-side feature gating
 *   x-context-resolved: {ms}             — resolution time for observability
 *
 * Applied globally in AppModule so all responses carry these headers.
 * Downstream clients (frontend apps, API gateway) can read x-tenant-tier
 * to show/hide features without an additional API call.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<TenantRuntimeRequest>();

    const response = context
      .switchToHttp()
      .getResponse<Response>();

    const runtime = request[TENANT_RUNTIME_KEY];

    if (runtime) {
      response.setHeader('x-tenant-id',        runtime.tenantId);
      response.setHeader('x-tenant-slug',       runtime.slug);
      response.setHeader('x-tenant-tier',       runtime.tier);
      response.setHeader('x-context-resolved',
        String(Date.now() - runtime.resolvedAt.getTime()) + 'ms',
      );
    }

    return next.handle();
  }
}
