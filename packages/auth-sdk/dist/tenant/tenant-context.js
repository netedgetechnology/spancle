"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantContext = void 0;
/**
 * TenantContext — immutable value object representing a resolved tenant
 * on an inbound request.
 *
 * Passed through the request lifecycle and injected into services.
 * Never mutated after construction.
 */
class TenantContext {
    constructor(params) {
        this.tenantId = params.tenantId;
        this.tenantSlug = params.tenantSlug;
        this.tier = params.tier;
        Object.freeze(this);
    }
    static fromRequest(params) {
        if (!params.tenantId || params.tenantId.trim() === '') {
            throw new Error('TenantContext requires a non-empty tenantId');
        }
        return new TenantContext(params);
    }
    /** Creates a system-level context for platform operations (no tenant). */
    static system() {
        return new TenantContext({ tenantId: 'system' });
    }
    isSystem() {
        return this.tenantId === 'system';
    }
    toString() {
        return `TenantContext(${this.tenantId})`;
    }
    toJSON() {
        return {
            tenantId: this.tenantId,
            tenantSlug: this.tenantSlug,
            tier: this.tier,
        };
    }
}
exports.TenantContext = TenantContext;
//# sourceMappingURL=tenant-context.js.map