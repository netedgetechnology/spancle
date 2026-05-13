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

export interface AuditRecord {
  tenantId: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
  ipAddress: string;
}

/**
 * AuditInterceptor — records every mutating HTTP operation.
 * Applied at controller class level — not optional.
 * Read operations (GET) are skipped to reduce noise.
 */
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
          this.writeAuditRecord(request, response.statusCode, startTime);
        },
        error: (error: { status?: number }) => {
          this.writeAuditRecord(request, error?.status ?? 500, startTime);
        },
      }),
    );
  }

  private writeAuditRecord(
    request: Request & { tenant?: TenantContext; user?: { id: string } },
    statusCode: number,
    startTime: number,
  ): void {
    const record: AuditRecord = {
      tenantId: request.tenant?.tenantId ?? 'system',
      actorId: request.user?.id ?? 'anonymous',
      action: `${request.method} ${request.path}`,
      resource: request.path.split('/')[3] ?? 'unknown',
      method: request.method,
      path: request.path,
      statusCode,
      durationMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      ipAddress: request.ip ?? 'unknown',
    };

    // TODO: Replace with AuditLogService write in Sprint 2
    this.logger.log(JSON.stringify(record));
  }
}
