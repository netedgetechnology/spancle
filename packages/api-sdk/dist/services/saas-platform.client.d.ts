import type { Tenant, CreateTenantDto, TenantSettings, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * SaasPlatformClient — typed client for saas-platform-service.
 *
 * Covers: tenant provisioning, subscription management, plan configuration.
 * Superadmin operations use RequestContext.system().
 */
export declare const SaasPlatformClient: {
    createTenant(dto: CreateTenantDto, ctx: RequestContext): Promise<Tenant>;
    getTenantById(tenantId: string, ctx: RequestContext): Promise<Tenant>;
    getTenantBySlug(slug: string, ctx: RequestContext): Promise<Tenant>;
    listTenants(params: {
        page?: number;
        limit?: number;
        status?: string;
        tier?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Tenant>>;
    updateTenant(tenantId: string, dto: Partial<CreateTenantDto>, ctx: RequestContext): Promise<Tenant>;
    updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>, ctx: RequestContext): Promise<Tenant>;
    suspendTenant(tenantId: string, reason: string, ctx: RequestContext): Promise<Tenant>;
    activateTenant(tenantId: string, ctx: RequestContext): Promise<Tenant>;
    terminateTenant(tenantId: string, reason: string, ctx: RequestContext): Promise<void>;
    changeTier(tenantId: string, newTier: string, ctx: RequestContext): Promise<Tenant>;
};
//# sourceMappingURL=saas-platform.client.d.ts.map