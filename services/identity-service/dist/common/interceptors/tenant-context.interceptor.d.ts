import { type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
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
export declare class TenantContextInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
//# sourceMappingURL=tenant-context.interceptor.d.ts.map