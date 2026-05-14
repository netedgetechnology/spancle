import { type CallHandler, type ExecutionContext, type NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
export declare class AuditInterceptor implements NestInterceptor {
    private readonly logger;
    private readonly mutating;
    intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown>;
    private write;
}
//# sourceMappingURL=audit.interceptor.d.ts.map