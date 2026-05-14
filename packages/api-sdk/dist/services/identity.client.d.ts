import type { Identity, TokenPair, LoginDto, RefreshTokenDto, CreateUserDto, User, PaginatedResult } from '@spancle/types';
import type { RequestContext } from '../core/request-context';
/**
 * IdentityClient — typed client for identity-service.
 *
 * Covers: authentication, token lifecycle, user management.
 * All methods throw SpancleApiError on failure.
 */
export declare const IdentityClient: {
    /**
     * Authenticates a user and returns an access/refresh token pair.
     * Does NOT require an access token in context — uses tenantId only.
     */
    login(dto: LoginDto, ctx: RequestContext): Promise<TokenPair>;
    /**
     * Exchanges a refresh token for a new token pair.
     */
    refreshToken(dto: RefreshTokenDto, ctx: RequestContext): Promise<TokenPair>;
    /**
     * Revokes the refresh token — invalidates the session.
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
};
//# sourceMappingURL=identity.client.d.ts.map