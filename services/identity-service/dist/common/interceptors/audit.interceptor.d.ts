import { type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
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
export declare class AuditInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly mutatingMethods;
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private writeAuditRecord;
}
//# sourceMappingURL=audit.interceptor.d.ts.map