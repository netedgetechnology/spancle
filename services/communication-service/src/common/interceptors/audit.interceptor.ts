import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { TenantContext } from '../decorators/tenant.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');
  private readonly mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { tenant?: TenantContext; user?: { id: string } }>();

    if (!this.mutatingMethods.has(request.method)) {
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          this.logAudit(request, response.statusCode, startTime);
        },
        error: (err: { status?: number }) => {
          this.logAudit(request, err?.status ?? 500, startTime);
        },
      }),
    );
  }

  private logAudit(
    request: Request & { tenant?: TenantContext; user?: { id: string } },
    statusCode: number,
    startTime: number,
  ): void {
    this.logger.log(JSON.stringify({
      tenantId: request.tenant?.tenantId ?? 'system',
      actorId: request.user?.id ?? 'anonymous',
      method: request.method,
      path: request.path,
      statusCode,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    }));
  }
}
