/**
 * TenantContext — immutable value object representing a resolved tenant
 * on an inbound request.
 *
 * Passed through the request lifecycle and injected into services.
 * Never mutated after construction.
 */
export class TenantContext {
  readonly tenantId:   string;
  readonly tenantSlug?: string;
  readonly tier?:      string;

  private constructor(params: {
    tenantId:   string;
    tenantSlug?: string;
    tier?:      string;
  }) {
    this.tenantId   = params.tenantId;
    this.tenantSlug = params.tenantSlug;
    this.tier       = params.tier;
    Object.freeze(this);
  }

  static fromRequest(params: {
    tenantId:   string;
    tenantSlug?: string;
    tier?:      string;
  }): TenantContext {
    if (!params.tenantId || params.tenantId.trim() === '') {
      throw new Error('TenantContext requires a non-empty tenantId');
    }
    return new TenantContext(params);
  }

  /** Creates a system-level context for platform operations (no tenant). */
  static system(): TenantContext {
    return new TenantContext({ tenantId: 'system' });
  }

  isSystem(): boolean {
    return this.tenantId === 'system';
  }

  toString(): string {
    return `TenantContext(${this.tenantId})`;
  }

  toJSON(): Record<string, string | undefined> {
    return {
      tenantId:   this.tenantId,
      tenantSlug: this.tenantSlug,
      tier:       this.tier,
    };
  }
}
