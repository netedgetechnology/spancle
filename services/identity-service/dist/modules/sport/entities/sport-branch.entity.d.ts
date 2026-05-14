/**
 * SportBranchEntity — join table linking a sport to the branches where
 * it is offered.
 *
 * Architecture decisions:
 *
 *   1. `tenantId` is on every row — not derived from the sport or branch FKs.
 *      This satisfies the TenantAwareRepository contract and enables
 *      RLS policies to scope queries without joins.
 *
 *   2. This is NOT a standard TypeORM @ManyToMany relation. We avoid
 *      TypeORM's auto-generated join tables because:
 *      a. They cannot carry tenantId (no extra columns on implicit join tables)
 *      b. We need soft-delete (isDeleted) on the mapping itself
 *      c. We need sortOrder for ordered branch display per sport
 *
 *   3. Uniqueness: UNIQUE(tenant_id, sport_id, branch_id) — the DB constraint
 *      prevents duplicate mappings. Service layer uses replace strategy
 *      (delete existing + insert new) to avoid concurrent insert conflicts.
 *
 *   4. No DB-level FK constraints on sport_id or branch_id — multi-tenant
 *      pattern enforces referential integrity at the service layer.
 *
 * Table: `sport_branches`
 */
export declare class SportBranchEntity {
    id: string;
    tenantId: string;
    /** FK → sports.id (same tenant) — enforced at service layer */
    sportId: string;
    /** FK → branches.id (same tenant) — enforced at service layer */
    branchId: string;
    /** Display order of branches within a sport's branch list */
    sortOrder: number;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=sport-branch.entity.d.ts.map