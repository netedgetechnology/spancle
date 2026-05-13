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
export class RequestContext {
  readonly tenantId:        string;
  readonly accessToken?:    string;
  readonly idempotencyKey?: string;
  readonly correlationId?:  string;
  readonly timeoutMs?:      number;

  private constructor(params: {
    tenantId:        string;
    accessToken?:    string;
    idempotencyKey?: string;
    correlationId?:  string;
    timeoutMs?:      number;
  }) {
    if (!params.tenantId || params.tenantId.trim() === '') {
      throw new Error('RequestContext: tenantId is required and cannot be empty');
    }
    this.tenantId        = params.tenantId;
    this.accessToken     = params.accessToken;
    this.idempotencyKey  = params.idempotencyKey;
    this.correlationId   = params.correlationId;
    this.timeoutMs       = params.timeoutMs;
    Object.freeze(this);
  }

  /**
   * Creates context from a NextAuth session object.
   */
  static fromSession(session: {
    tenantId:     string;
    accessToken?: string;
  }): RequestContext {
    return new RequestContext({
      tenantId:    session.tenantId,
      accessToken: session.accessToken,
    });
  }

  /**
   * Creates context for service-to-service calls with a service account token.
   */
  static serviceAccount(tenantId: string, serviceToken: string): RequestContext {
    return new RequestContext({ tenantId, accessToken: serviceToken });
  }

  /**
   * Creates a system-level context for platform-wide (cross-tenant) operations.
   * Only SUPER_ADMIN tokens should be used here.
   */
  static system(superAdminToken: string): RequestContext {
    return new RequestContext({ tenantId: 'system', accessToken: superAdminToken });
  }

  /**
   * Returns a new context with an idempotency key attached.
   */
  withIdempotencyKey(key: string): RequestContext {
    return new RequestContext({ ...this, idempotencyKey: key });
  }

  /**
   * Returns a new context with a correlation ID attached.
   */
  withCorrelationId(id: string): RequestContext {
    return new RequestContext({ ...this, correlationId: id });
  }

  /**
   * Returns a new context with a custom timeout.
   */
  withTimeout(ms: number): RequestContext {
    return new RequestContext({ ...this, timeoutMs: ms });
  }

  toHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'x-tenant-id': this.tenantId,
    };
    if (this.accessToken)    headers['Authorization']      = `Bearer ${this.accessToken}`;
    if (this.idempotencyKey) headers['x-idempotency-key']  = this.idempotencyKey;
    if (this.correlationId)  headers['x-correlation-id']   = this.correlationId;
    return headers;
  }
}
