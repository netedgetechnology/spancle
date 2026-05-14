"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RequestContextProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.REQUEST_CONTEXT = exports.RequestContextProvider = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const tenant_context_types_1 = require("../../modules/tenant/types/tenant-context.types");
const tenant_cls_context_1 = require("./tenant-cls.context");
/**
 * RequestContextProvider — REQUEST-scoped provider.
 *
 * Bridges the Express request object and NestJS dependency injection.
 * Services that need TenantContextRuntime inject this provider and call
 * getTenantContext() rather than reading from CLS directly.
 *
 * Scope: REQUEST — a new instance is created per HTTP request.
 * This means it CANNOT be injected into SINGLETON-scoped providers.
 * Singleton services must use TenantClsContext.getOrThrow() instead.
 *
 * Registration in AppModule:
 *   providers: [RequestContextProvider]
 *   exports:   [RequestContextProvider]
 *
 * Injection in service:
 *   constructor(
 *     private readonly requestCtx: RequestContextProvider,
 *   ) {}
 *
 *   someMethod(): void {
 *     const tenant = this.requestCtx.getTenantContext();
 *   }
 */
let RequestContextProvider = RequestContextProvider_1 = class RequestContextProvider {
    constructor(request) {
        this.request = request;
        this.logger = new common_1.Logger(RequestContextProvider_1.name);
    }
    /**
     * Returns the TenantContextRuntime attached to the current request.
     * Throws MissingTenantContextError if TenantResolverMiddleware has not run.
     */
    getTenantContext() {
        const ctx = this.request[tenant_context_types_1.TENANT_RUNTIME_KEY];
        if (!ctx) {
            throw new tenant_cls_context_1.MissingTenantContextError();
        }
        return ctx;
    }
    /**
     * Returns the TenantContextRuntime or null if not present.
     * Use when tenant context is optional (e.g. health check endpoints).
     */
    getTenantContextOrNull() {
        return this.request[tenant_context_types_1.TENANT_RUNTIME_KEY] ?? null;
    }
    /**
     * Convenience accessor — returns tenantId directly.
     */
    getTenantId() {
        return this.getTenantContext().tenantId;
    }
    /**
     * Convenience accessor — checks plan feature availability.
     */
    hasFeature(feature) {
        return this.getTenantContext().planLimits.features[feature] === true;
    }
    onDestroy() {
        // No cleanup needed — request object cleaned up by Express
    }
};
exports.RequestContextProvider = RequestContextProvider;
exports.RequestContextProvider = RequestContextProvider = RequestContextProvider_1 = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __param(0, (0, common_1.Inject)(core_1.REQUEST)),
    __metadata("design:paramtypes", [Object])
], RequestContextProvider);
/**
 * DI injection token for RequestContextProvider.
 * Prefer direct class injection — use this token for testing overrides.
 */
exports.REQUEST_CONTEXT = Symbol('SPANCLE_REQUEST_CONTEXT');
//# sourceMappingURL=request-context.provider.js.map