export declare class RoleEntity {
    id: string;
    /** Tenant isolation — enforced by PostgreSQL RLS policy */
    tenantId: string;
    name: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=role.entity.d.ts.map