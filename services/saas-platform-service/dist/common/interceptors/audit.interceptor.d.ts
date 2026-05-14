import { type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
export declare class AuditInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly mutatingMethods;
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
    private logAudit;
}
//# sourceMappingURL=audit.interceptor.d.ts.map