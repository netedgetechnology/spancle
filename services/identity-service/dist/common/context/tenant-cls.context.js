"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingTenantContextError = exports.TenantClsContext = void 0;
const async_hooks_1 = require("async_hooks");
const storage = new async_hooks_1.AsyncLocalStorage();
class TenantClsContext {
    static run(runtime, callback) {
        storage.run(runtime, callback);
    }
    static get() {
        return storage.getStore();
    }
    static getOrThrow() {
        const ctx = storage.getStore();
        if (!ctx) {
            throw new MissingTenantContextError();
        }
        return ctx;
    }
    static getTenantId() {
        return TenantClsContext.getOrThrow().tenantId;
    }
    static hasTenantContext() {
        return storage.getStore() !== undefined;
    }
    static disableForTesting() {
        if (process.env['NODE_ENV'] !== 'test') {
            throw new Error('TenantClsContext.disableForTesting() called outside test environment');
        }
        storage.enterWith(undefined);
    }
}
exports.TenantClsContext = TenantClsContext;
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