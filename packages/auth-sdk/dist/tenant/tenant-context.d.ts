/**
 * TenantContext — immutable value object representing a resolved tenant
 * on an inbound request.
 *
 * Passed through the request lifecycle and injected into services.
 * Never mutated after construction.
 */
export declare class TenantContext {
    readonly tenantId: string;
    readonly tenantSlug?: string;
    readonly tier?: string;
    private constructor();
    static fromRequest(params: {
        tenantId: string;
        tenantSlug?: string;
        tier?: string;
    }): TenantContext;
    /** Creates a system-level context for platform operations (no tenant). */
    static system(): TenantContext;
    isSystem(): boolean;
    toString(): string;
    toJSON(): Record<string, string | undefined>;
}
//# sourceMappingURL=tenant-context.d.ts.map