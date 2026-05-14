import type { Request } from 'express';
import { TENANT_RUNTIME_KEY, type TenantContextRuntime } from '../../modules/tenant/types/tenant-context.types';
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
export declare class RequestContextProvider {
    private readonly request;
    private readonly logger;
    constructor(request: Request & {
        [TENANT_RUNTIME_KEY]?: TenantContextRuntime;
    });
    /**
     * Returns the TenantContextRuntime attached to the current request.
     * Throws MissingTenantContextError if TenantResolverMiddleware has not run.
     */
    getTenantContext(): TenantContextRuntime;
    /**
     * Returns the TenantContextRuntime or null if not present.
     * Use when tenant context is optional (e.g. health check endpoints).
     */
    getTenantContextOrNull(): TenantContextRuntime | null;
    /**
     * Convenience accessor — returns tenantId directly.
     */
    getTenantId(): string;
    /**
     * Convenience accessor — checks plan feature availability.
     */
    hasFeature(feature: keyof TenantContextRuntime['planLimits']['features']): boolean;
    onDestroy(): void;
}
/**
 * DI injection token for RequestContextProvider.
 * Prefer direct class injection — use this token for testing overrides.
 */
export declare const REQUEST_CONTEXT: unique symbol;
//# sourceMappingURL=request-context.provider.d.ts.map