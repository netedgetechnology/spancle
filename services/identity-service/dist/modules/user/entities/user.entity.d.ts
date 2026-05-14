/**
 * SystemRole values for tenant-level users.
 * TENANT_ADMIN is the role assigned to the user created during onboarding.
 */
export type UserRole = 'TENANT_ADMIN' | 'TENANT_MANAGER' | 'TENANT_STAFF' | 'VIEWER' | 'COACH' | 'PLAYER';
export declare class UserEntity {
    id: string;
    /** Tenant isolation — enforced by PostgreSQL RLS policy */
    tenantId: string;
    name: string;
    /**
     * Email — denormalised from IdentityEntity for user-management queries.
     * Source of truth remains the identity record.
     */
    email: string;
    /**
     * Role — tenant-level system role, enforced by RolesGuard.
     * Set to 'TENANT_ADMIN' for the user created during onboarding.
     */
    role: UserRole;
    /** Set when the user's email address has been verified */
    emailVerifiedAt: Date | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=user.entity.d.ts.map