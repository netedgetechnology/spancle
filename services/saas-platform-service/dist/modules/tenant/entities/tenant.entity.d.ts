export declare class TenantEntity {
    id: string;
    /** Tenant isolation — enforced by PostgreSQL RLS policy */
    tenantId: string;
    name: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=tenant.entity.d.ts.map