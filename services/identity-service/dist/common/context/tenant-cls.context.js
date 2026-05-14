"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingTenantContextError = exports.TenantClsContext = void 0;
const async_hooks_1 = require("async_hooks");
/**
 * TenantClsContext — Continuation Local Storage for tenant context.
 *
 * Uses Node.js built-in AsyncLocalStorage to propagate TenantContextRuntime
 * implicitly across all async boundaries within a single request — including:
 *   - Promise chains
 *   - async/await
 *   - EventEmitter callbacks
 *   - setTimeout / setImmediate
 *   - TypeORM query execution
 *
 * This means services and repositories can retrieve the current tenant
 * context WITHOUT being passed it explicitly in every method signature.
 *
 * Usage in middleware (set):
 *   TenantClsContext.run(runtimeCtx, () => next());
 *
 * Usage in service/repository (get):
 *   const ctx = TenantClsContext.get();
 *   if (!ctx) throw new MissingTenantContextError();
 *
 * IMPORTANT: Never use this as a substitute for the explicit TenantId
 * parameter on repository queries. The CLS provides a safety net and
 * an implicit accessor — the explicit parameter remains the source of truth
 * for query isolation.
 */
// Singleton storage — one per Node.js process
const storage = new async_hooks_1.AsyncLocalStorage();
class TenantClsContext {
    /**
     * Runs a callback within a CLS context carrying the given runtime.
     * The context is automatically destroyed when the callback resolves.
     */
    static run(runtime, callback) {
        storage.run(runtime, callback);
    }
    /**
     * Returns the TenantContextRuntime for the current async context.
     * Returns undefined if called outside a CLS-wrapped context.
     */
    static get() {
        return storage.getStore();
    }
    /**
     * Returns the TenantContextRuntime or throws MissingTenantContextError.
     * Use in repositories and services that require tenant isolation.
     */
    static getOrThrow() {
        const ctx = storage.getStore();
        if (!ctx) {
            throw new MissingTenantContextError();
        }
        return ctx;
    }
    /**
     * Returns just the tenantId string or throws.
     * Convenience wrapper for repositories.
     */
    static getTenantId() {
        return TenantClsContext.getOrThrow().tenantId;
    }
    /**
     * Returns true if currently executing within a tenant context.
     */
    static hasTenantContext() {
        return storage.getStore() !== undefined;
    }
    /**
     * Disables CLS storage — use only in test environments.
     * Calling this in production will break tenant isolation.
     */
    static disableForTesting() {
        if (process.env['NODE_ENV'] !== 'test') {
            throw new Error('TenantClsContext.disableForTesting() called outside test environment');
        }
        storage.enterWith(undefined);
    }
}
exports.TenantClsContext = TenantClsContext;
/**
 * MissingTenantContextError — thrown when CLS context is absent.
 * This indicates a middleware ordering bug, not a user error.
 */
class MissingTenantContextError extends Error {
    constructor() {
        super('TenantContextRuntime not found in CLS store. ' +
            'Ensure TenantResolverMiddleware runs before the service method. ' +
            'This is an application configuration error, not a user error.');
        this.name = 'MissingTenantContextError';
    }
}
exports.MissingTenantContextError = MissingTenantContextError;
//# sourceMappingURL=tenant-cls.context.js.map