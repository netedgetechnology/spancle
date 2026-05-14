import type { Repository } from 'typeorm';
import { IdentityEntity } from '../entities/identity.entity';
export declare class IdentityRepository {
    private readonly repo;
    private readonly logger;
    constructor(repo: Repository<IdentityEntity>);
    /**
     * All queries MUST filter by tenantId — no cross-tenant reads permitted.
     */
    findByEmailAndTenant(email: string, tenantId: string): Promise<IdentityEntity | null>;
    findByIdAndTenant(id: string, tenantId: string): Promise<IdentityEntity | null>;
    create(entity: Partial<IdentityEntity>): Promise<IdentityEntity>;
    /**
     * Records a successful login — resets failure counters, updates lastLoginAt.
     */
    updateLoginSuccess(id: string, tenantId: string): Promise<void>;
    /**
     * Records a failed login attempt — increments counter, optionally sets lock.
     */
    updateLoginFailure(id: string, tenantId: string, attemptCount: number, lockedUntil: Date | null): Promise<void>;
    /**
     * Updates the password hash and sets passwordChangedAt timestamp.
     */
    updatePassword(id: string, tenantId: string, newHash: string): Promise<void>;
    /**
     * Resolves the system role for an identity by joining to the user and role tables.
     * Returns null if no role is assigned — caller defaults to 'VIEWER'.
     *
     * TODO: Join to user → role in Sprint 2 when UserModule is wired.
     */
    getRoleForIdentity(identityId: string, _tenantId: string): Promise<string | null>;
    updateLastLogin(id: string, tenantId: string): Promise<void>;
    deactivate(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=identity.repository.d.ts.map