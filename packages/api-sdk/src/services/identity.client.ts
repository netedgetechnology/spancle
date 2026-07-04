import type {
  Identity,
  TokenPair,
  LoginDto,
  RefreshTokenDto,
  CreateUserDto,
  User,
  Tenant,
  TenantSettings,
  CreateTenantDto,
  PaginatedResult,
} from '@spancle/types';

import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('identity');

/**
 * ============================================================================
 * IdentityClient
 * ============================================================================
 *
 * Owns:
 *
 * • Authentication
 * • Identity
 * • Users
 * • Platform Tenant Lifecycle
 *
 * This client maps directly to identity-service.
 *
 * ============================================================================
 */

export const IdentityClient = {

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  /**
   * Login
   */
  async login(
    dto: LoginDto,
    ctx: RequestContext,
  ): Promise<TokenPair> {
    return http.post<TokenPair>(
      '/auth/login',
      dto,
      ctx,
    );
  },

  /**
   * Refresh access token
   */
  async refreshToken(
    dto: RefreshTokenDto,
    ctx: RequestContext,
  ): Promise<TokenPair> {
    return http.post<TokenPair>(
      '/auth/refresh',
      dto,
      ctx,
    );
  },

  /**
   * Logout
   */
  async logout(
    dto: RefreshTokenDto,
    ctx: RequestContext,
  ): Promise<void> {
    return http.post<void>(
      '/auth/logout',
      dto,
      ctx,
    );
  },

  // -------------------------------------------------------------------------
  // Identity
  // -------------------------------------------------------------------------

  async getIdentityById(
    identityId: string,
    ctx: RequestContext,
  ): Promise<Identity> {
    return http.get<Identity>(
      `/identities/${identityId}`,
      ctx,
    );
  },

  async deactivateIdentity(
    identityId: string,
    ctx: RequestContext,
  ): Promise<void> {
    return http.delete<void>(
      `/identities/${identityId}`,
      ctx,
    );
  },

  // -------------------------------------------------------------------------
  // Users
  // -------------------------------------------------------------------------

  async createUser(
    dto: CreateUserDto,
    ctx: RequestContext,
  ): Promise<User> {
    return http.post<User>(
      '/users',
      dto,
      ctx,
    );
  },

  async getUserById(
    userId: string,
    ctx: RequestContext,
  ): Promise<User> {
    return http.get<User>(
      `/users/${userId}`,
      ctx,
    );
  },

  async listUsers(
    params: {
      page?: number;
      limit?: number;
      search?: string;
    },
    ctx: RequestContext,
  ): Promise<PaginatedResult<User>> {

    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();

    return http.get<PaginatedResult<User>>(
      `/users${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async updateUser(
    userId: string,
    dto: Partial<CreateUserDto>,
    ctx: RequestContext,
  ): Promise<User> {
    return http.patch<User>(
      `/users/${userId}`,
      dto,
      ctx,
    );
  },

  async deleteUser(
    userId: string,
    ctx: RequestContext,
  ): Promise<void> {
    return http.delete<void>(
      `/users/${userId}`,
      ctx,
    );
  },
    // -------------------------------------------------------------------------
  // Platform Tenant Lifecycle
  // -------------------------------------------------------------------------

  async createTenant(
    dto: CreateTenantDto,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.post<Tenant>(
      '/tenants',
      dto,
      ctx,
    );
  },

  async listTenants(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      tier?: string;
    },
    ctx: RequestContext,
  ): Promise<PaginatedResult<Tenant>> {

    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();

    return http.get<PaginatedResult<Tenant>>(
      `/tenants${query ? `?${query}` : ''}`,
      ctx,
    );
  },

  async getTenantById(
    tenantId: string,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.get<Tenant>(
      `/tenants/${tenantId}`,
      ctx,
    );
  },

  async updateTenant(
    tenantId: string,
    dto: Partial<CreateTenantDto>,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.patch<Tenant>(
      `/tenants/${tenantId}`,
      dto,
      ctx,
    );
  },

  async updateTenantSettings(
    tenantId: string,
    settings: Partial<TenantSettings>,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.patch<Tenant>(
      `/tenants/${tenantId}/settings`,
      {
        settings,
      },
      ctx,
    );
  },

  async activateTenant(
    tenantId: string,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.post<Tenant>(
      `/tenants/${tenantId}/activate`,
      {},
      ctx,
    );
  },

  async suspendTenant(
    tenantId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.post<Tenant>(
      `/tenants/${tenantId}/suspend`,
      {
        reason,
      },
      ctx,
    );
  },

  async terminateTenant(
    tenantId: string,
    reason: string,
    ctx: RequestContext,
  ): Promise<void> {
    return http.post<void>(
      `/tenants/${tenantId}/terminate`,
      {
        reason,
      },
      ctx,
    );
  },
  


    async changeTier(
    tenantId: string,
    tier: string,
    ctx: RequestContext,
  ): Promise<Tenant> {
    return http.patch<Tenant>(
      `/tenants/${tenantId}/tier`,
      {
        tier,
      },
      ctx,
    );
  },

  async checkSlugAvailable(
    slug: string,
    ctx: RequestContext,
  ): Promise<{
    available: boolean;
    slug: string;
  }> {
    return http.get<{
      available: boolean;
      slug: string;
    }>(
      `/tenants/slug-available?slug=${encodeURIComponent(slug)}`,
      ctx,
    );
  },

  async resolveTenant(
    query: string,
    ctx: RequestContext,
  ): Promise<{
    slug: string;
    name: string;
    redirectUrl: string;
  } | null> {
    return http.get<{
      slug: string;
      name: string;
      redirectUrl: string;
    } | null>(
      `/tenants/resolve?q=${encodeURIComponent(query)}`,
      ctx,
    );
  },
};
