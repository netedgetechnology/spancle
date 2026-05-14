export declare class IdentityEntity {
    id: string;
    /** Tenant isolation — every row MUST carry this. Enforced by RLS policy. */
    tenantId: string;
    userId: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    isEmailVerified: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    lastLoginAt: Date | null;
    passwordChangedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=identity.entity.d.ts.map