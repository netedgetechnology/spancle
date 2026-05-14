export declare class VenueEntity {
    id: string;
    /** Tenant isolation — enforced by PostgreSQL RLS policy */
    tenantId: string;
    name: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=venue.entity.d.ts.map