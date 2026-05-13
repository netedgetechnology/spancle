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
import type { TenantContext }      from '../decorators/tenant.decorator';
import type { BookingActorContext } from '../decorators/current-user.decorator';

interface AuditRecord {
  tenantId:   string;
  actorId:    string;
  actorRole:  string;
  method:     string;
  path:       string;
  statusCode: number;
  durationMs: number;
  ipAddress:  string;
  userAgent:  string;
  timestamp:  string;
  resource:   string;
  resourceId?: string;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditLog');
  private readonly mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<
      Request & { tenant?: TenantContext; actor?: BookingActorContext }
    >();

    if (!this.mutating.has(req.method)) return next.handle();

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next:  ()                     => this.write(req, ctx, 'success', start),
        error: (e: { status?: number }) => this.write(req, ctx, 'error',   start, e?.status),
      }),
    );
  }

  private write(
    req:    Request & { tenant?: TenantContext; actor?: BookingActorContext },
    ctx:    ExecutionContext,
    result: 'success' | 'error',
    start:  number,
    errorStatus?: number,
  ): void {
    const resp = ctx.switchToHttp().getResponse<{ statusCode: number }>();
    const pathParts = req.path.split('/').filter(Boolean);
    // Path shape: /api/v1/{resource}/{id?}/{sub?}
    const resource   = pathParts[2] ?? 'unknown';
    const resourceId = pathParts[3] && UUID_RE.test(pathParts[3]) ? pathParts[3] : undefined;

    const record: AuditRecord = {
      tenantId:   req.tenant?.tenantId ?? 'unresolved',
      actorId:    req.actor?.actorId   ?? req.headers['x-actor-id'] as string ?? 'anonymous',
      actorRole:  req.actor?.role      ?? 'unknown',
      method:     req.method,
      path:       req.path,
      statusCode: result === 'error' ? (errorStatus ?? 500) : resp.statusCode,
      durationMs: Date.now() - start,
      ipAddress:  (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? '',
      userAgent:  (req.headers['user-agent'] as string) ?? '',
      timestamp:  new Date().toISOString(),
      resource,
      resourceId,
    };

    this.logger.log(JSON.stringify(record));
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
