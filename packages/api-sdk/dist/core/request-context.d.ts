/**
 * RequestContext — immutable value object carrying per-request credentials.
 *
 * Every SDK client method accepts a RequestContext. This is the ONLY
 * mechanism by which auth tokens and tenant identity flow into HTTP calls.
 * No secrets are read from process.env inside the SDK.
 *
 * Usage (server):
 *   const ctx = RequestContext.fromSession(session);
 *   await identityClient.login(dto, ctx);
 *
 * Usage (service-to-service):
 *   const ctx = RequestContext.serviceAccount(tenantId, serviceToken);
 */
export declare class RequestContext {
    readonly tenantId: string;
    readonly accessToken?: string;
    readonly idempotencyKey?: string;
    readonly correlationId?: string;
    readonly timeoutMs?: number;
    private constructor();
    /**
     * Creates context from a NextAuth session object.
     */
    static fromSession(session: {
        tenantId: string;
        accessToken?: string;
    }): RequestContext;
    /**
     * Creates context for service-to-service calls with a service account token.
     */
    static serviceAccount(tenantId: string, serviceToken: string): RequestContext;
    /**
     * Creates a system-level context for platform-wide (cross-tenant) operations.
     * Only SUPER_ADMIN tokens should be used here.
     */
    static system(superAdminToken: string): RequestContext;
    /**
     * Returns a new context with an idempotency key attached.
     */
    withIdempotencyKey(key: string): RequestContext;
    /**
     * Returns a new context with a correlation ID attached.
     */
    withCorrelationId(id: string): RequestContext;
    /**
     * Returns a new context with a custom timeout.
     */
    withTimeout(ms: number): RequestContext;
    toHeaders(): Record<string, string>;
}
//# sourceMappingURL=request-context.d.ts.map