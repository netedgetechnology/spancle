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
                this.logAudit(request, response.statusCode, startTime);
            },
            error: (err) => {
                this.logAudit(request, err?.status ?? 500, startTime);
            },
        }));
    }
    logAudit(request, statusCode, startTime) {
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
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)()
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map