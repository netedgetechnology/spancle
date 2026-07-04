import type { Identity, TokenPair, LoginDto, RefreshTokenDto, CreateUserDto, User, Tenant, TenantSettings, CreateTenantDto, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
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
export declare const IdentityClient: {
    /**
     * Login
     */
    login(dto: LoginDto, ctx: RequestContext): Promise<TokenPair>;
    /**
     * Refresh access token
     */
    refreshToken(dto: RefreshTokenDto, ctx: RequestContext): Promise<TokenPair>;
    /**
     * Logout
     */
    logout(dto: RefreshTokenDto, ctx: RequestContext): Promise<void>;
    getIdentityById(identityId: string, ctx: RequestContext): Promise<Identity>;
    deactivateIdentity(identityId: string, ctx: RequestContext): Promise<void>;
    createUser(dto: CreateUserDto, ctx: RequestContext): Promise<User>;
    getUserById(userId: string, ctx: RequestContext): Promise<User>;
    listUsers(params: {
        page?: number;
        limit?: number;
        search?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<User>>;
    updateUser(userId: string, dto: Partial<CreateUserDto>, ctx: RequestContext): Promise<User>;
    deleteUser(userId: string, ctx: RequestContext): Promise<void>;
    createTenant(dto: CreateTenantDto, ctx: RequestContext): Promise<Tenant>;
    listTenants(params: {
        page?: number;
        limit?: number;
        status?: string;
        tier?: string;
    }, ctx: RequestContext): Promise<PaginatedResult<Tenant>>;
    getTenantById(tenantId: string, ctx: RequestContext): Promise<Tenant>;
    updateTenant(tenantId: string, dto: Partial<CreateTenantDto>, ctx: RequestContext): Promise<Tenant>;
    updateTenantSettings(tenantId: string, settings: Partial<TenantSettings>, ctx: RequestContext): Promise<Tenant>;
    activateTenant(tenantId: string, ctx: RequestContext): Promise<Tenant>;
    suspendTenant(tenantId: string, reason: string, ctx: RequestContext): Promise<Tenant>;
    terminateTenant(tenantId: string, reason: string, ctx: RequestContext): Promise<void>;
    changeTier(tenantId: string, tier: string, ctx: RequestContext): Promise<Tenant>;
    checkSlugAvailable(slug: string, ctx: RequestContext): Promise<{
        available: boolean;
        slug: string;
    }>;
    resolveTenant(query: string, ctx: RequestContext): Promise<{
        slug: string;
        name: string;
        redirectUrl: string;
    } | null>;
};
//# sourceMappingURL=identity.client.d.ts.map