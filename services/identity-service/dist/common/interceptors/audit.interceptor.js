"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
/**
 * AuditInterceptor — records every mutating HTTP operation.
 * Applied at controller class level — not optional.
 * Read operations (GET) are skipped to reduce noise.
 */
let AuditInterceptor = class AuditInterceptor {
    constructor() {
        this.logger = new common_1.Logger('AuditLog');
        this.mutatingMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    }
    intercept(context, next) {
        const request = context
            .switchToHttp()
            .getRequest();
        if (!this.mutatingMethods.has(request.method)) {
            return next.handle();
        }
        const startTime = Date.now();
        return next.handle().pipe((0, operators_1.tap)({
            next: () => {
                const response = context.switchToHttp().getResponse();
                this.writeAuditRecord(request, response.statusCode, startTime);
            },
            error: (error) => {
                this.writeAuditRecord(request, error?.status ?? 500, startTime);
            },
        }));
    }
    writeAuditRecord(request, statusCode, startTime) {
        const record = {
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
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)()
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map