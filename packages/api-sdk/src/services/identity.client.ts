import type {
  Identity,
  TokenPair,
  LoginDto,
  RefreshTokenDto,
  CreateUserDto,
  User,
  PaginatedResult,
} from '@spancle/types';
import { createHttpClient } from '../core/http-client';
import type { RequestContext } from '../core/request-context';

const http = createHttpClient('identity');

/**
 * IdentityClient — typed client for identity-service.
 *
 * Covers: authentication, token lifecycle, user management.
 * All methods throw SpancleApiError on failure.
 */
export const IdentityClient = {

  // ── Auth ──────────────────────────────────────────────────────────────────

  /**
   * Authenticates a user and returns an access/refresh token pair.
   * Does NOT require an access token in context — uses tenantId only.
   */
  async login(dto: LoginDto, ctx: RequestContext): Promise<TokenPair> {
    return http.post<TokenPair>('/auth/login', dto, ctx);
  },

  /**
   * Exchanges a refresh token for a new token pair.
   */
  async refreshToken(dto: RefreshTokenDto, ctx: RequestContext): Promise<TokenPair> {
    return http.post<TokenPair>('/auth/refresh', dto, ctx);
  },

  /**
   * Revokes the refresh token — invalidates the session.
   */
  async logout(dto: RefreshTokenDto, ctx: RequestContext): Promise<void> {
    return http.post<void>('/auth/logout', dto, ctx);
  },

  // ── Identity resource ─────────────────────────────────────────────────────

  async getIdentityById(identityId: string, ctx: RequestContext): Promise<Identity> {
    return http.get<Identity>(`/identities/${identityId}`, ctx);
  },

  async deactivateIdentity(identityId: string, ctx: RequestContext): Promise<void> {
    return http.delete<void>(`/identities/${identityId}`, ctx);
  },

  // ── Users ─────────────────────────────────────────────────────────────────

  async createUser(dto: CreateUserDto, ctx: RequestContext): Promise<User> {
    return http.post<User>('/users', dto, ctx);
  },

  async getUserById(userId: string, ctx: RequestContext): Promise<User> {
    return http.get<User>(`/users/${userId}`, ctx);
  },

  async listUsers(
    params: { page?: number; limit?: number; search?: string },
    ctx: RequestContext,
  ): Promise<PaginatedResult<User>> {
    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();
    return http.get<PaginatedResult<User>>(`/users${query ? `?${query}` : ''}`, ctx);
  },

  async updateUser(
    userId: string,
    dto: Partial<CreateUserDto>,
    ctx: RequestContext,
  ): Promise<User> {
    return http.patch<User>(`/users/${userId}`, dto, ctx);
  },

  async deleteUser(userId: string, ctx: RequestContext): Promise<void> {
    return http.delete<void>(`/users/${userId}`, ctx);
  },
};
