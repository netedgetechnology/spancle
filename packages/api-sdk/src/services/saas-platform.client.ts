import type {
  Tenant,
  CreateTenantDto,
  TenantSettings,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('saas-platform');

/**
 * SaasPlatformClient — typed client for saas-platform-service.
 *
 * Covers: tenant provisioning, subscription management, plan configuration.
 * Superadmin operations use RequestContext.system().
 */
export const SaasPlatformClient = {

  // ── Tenants ───────────────────────────────────────────────────────────────

  async createTenant(dto: CreateTenantDto, ctx: RequestContext): Promise<Tenant> {
    return http.post<Tenant>('/tenants', dto, ctx);
  },

  async getTenantById(tenantId: string, ctx: RequestContext): Promise<Tenant> {
    return http.get<Tenant>(`/tenants/${tenantId}`, ctx);
  },

  async getTenantBySlug(slug: string, ctx: RequestContext): Promise<Tenant> {
    return http.get<Tenant>(`/tenants/slug/${slug}`, ctx);
  },

  async listTenants(
    params: { page?: number; limit?: number; status?: string; tier?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Tenant>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString();
    return http.get<PaginatedResult<Tenant>>(`/tenants${query ? `?${query}` : ''}`, ctx);
  },

  async updateTenant(
    tenantId: string,
    dto: Partial<CreateTenantDto>,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.patch<Tenant>(`/tenants/${tenantId}`, dto, ctx);
  },

  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.patch<Tenant>(`/tenants/${tenantId}/settings`, settings, ctx);
  },

  async suspendTenant(
    tenantId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.post<Tenant>(`/tenants/${tenantId}/suspend`, { reason }, ctx);
  },

  async activateTenant(tenantId: string, ctx: RequestContext): Promise<Tenant> {
    return http.post<Tenant>(`/tenants/${tenantId}/activate`, {}, ctx);
  },

  async terminateTenant(
    tenantId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<void> {
    return http.post<void>(`/tenants/${tenantId}/terminate`, { reason }, ctx);
  },

  // ── Subscriptions ─────────────────────────────────────────────────────────

  async changeTier(
    tenantId: string,
    newTier: string,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.post<Tenant>(`/tenants/${tenantId}/tier`, { tier: newTier }, ctx);
  },
};
