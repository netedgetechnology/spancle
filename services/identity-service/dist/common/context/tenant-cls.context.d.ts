import type { TenantContextRuntime } from '../../modules/tenant/types/tenant-context.types';
export declare class TenantClsContext {
    /**
     * Runs a callback within a CLS context carrying the given runtime.
     * The context is automatically destroyed when the callback resolves.
     */
    static run(runtime: TenantContextRuntime, callback: () => void): void;
    /**
     * Returns the TenantContextRuntime for the current async context.
     * Returns undefined if called outside a CLS-wrapped context.
     */
    static get(): TenantContextRuntime | undefined;
    /**
     * Returns the TenantContextRuntime or throws MissingTenantContextError.
     * Use in repositories and services that require tenant isolation.
     */
    static getOrThrow(): TenantContextRuntime;
    /**
     * Returns just the tenantId string or throws.
     * Convenience wrapper for repositories.
     */
    static getTenantId(): string;
    /**
     * Returns true if currently executing within a tenant context.
     */
    static hasTenantContext(): boolean;
    /**
     * Disables CLS storage — use only in test environments.
     * Calling this in production will break tenant isolation.
     */
    static disableForTesting(): void;
}
/**
 * MissingTenantContextError — thrown when CLS context is absent.
 * This indicates a middleware ordering bug, not a user error.
 */
export declare class MissingTenantContextError extends Error {
    constructor();
}
//# sourceMappingURL=tenant-cls.context.d.ts.map