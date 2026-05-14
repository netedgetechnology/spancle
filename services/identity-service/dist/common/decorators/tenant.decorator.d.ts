export interface TenantContext {
    tenantId: string;
}
/**
 * Extracts resolved tenant context from the request object.
 * TenantGuard must run before any controller using this decorator.
 *
 * Usage: @TenantCtx() tenant: TenantContext
 */
export declare const TenantCtx: (...dataOrPipes: unknown[]) => ParameterDecorator;
//# sourceMappingURL=tenant.decorator.d.ts.map