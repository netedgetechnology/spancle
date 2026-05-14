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
        this.mutating = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
    }
    intercept(ctx, next) {
        const req = ctx.switchToHttp().getRequest();
        if (!this.mutating.has(req.method))
            return next.handle();
        const start = Date.now();
        return next.handle().pipe((0, operators_1.tap)({
            next: () => this.write(req, ctx, 'success', start),
            error: (e) => this.write(req, ctx, 'error', start, e?.status),
        }));
    }
    write(req, ctx, result, start, errorStatus) {
        const resp = ctx.switchToHttp().getResponse();
        const pathParts = req.path.split('/').filter(Boolean);
        // Path shape: /api/v1/{resource}/{id?}/{sub?}
        const resource = pathParts[2] ?? 'unknown';
        const resourceId = pathParts[3] && UUID_RE.test(pathParts[3]) ? pathParts[3] : undefined;
        const record = {
            tenantId: req.tenant?.tenantId ?? 'unresolved',
            actorId: req.actor?.actorId ?? req.headers['x-actor-id'] ?? 'anonymous',
            actorRole: req.actor?.role ?? 'unknown',
            method: req.method,
            path: req.path,
            statusCode: result === 'error' ? (errorStatus ?? 500) : resp.statusCode,
            durationMs: Date.now() - start,
            ipAddress: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? req.ip ?? '',
            userAgent: req.headers['user-agent'] ?? '',
            timestamp: new Date().toISOString(),
            resource,
            resourceId,
        };
        this.logger.log(JSON.stringify(record));
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)()
], AuditInterceptor);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
//# sourceMappingURL=audit.interceptor.js.map