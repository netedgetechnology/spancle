import { DataSource } from 'typeorm';
import type { TenantStatus, TenantTier } from '@spancle/types';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { TenantEntity } from '../entities/tenant.entity';
/**
 * TenantRepository — extends TenantAwareRepository for tenant registry operations.
 *
 * Special consideration: the Tenants table is the root of multi-tenancy.
 * Queries here are often CROSS-TENANT (superadmin operations) or
 * SELF-TENANT (a tenant reading its own record).
 *
 * Cross-tenant methods (e.g. findBySlug) do not use scopedQb() intentionally —
 * they are used during resolution before a tenant context is established.
 * These are clearly documented as cross-tenant operations.
 */
export declare class TenantRepository extends TenantAwareRepository<TenantEntity> {
    constructor(dataSource: DataSource);
    /**
     * Finds a tenant by slug — CROSS-TENANT.
     * Called during subdomain resolution before context is established.
     */
    findBySlug(slug: string): Promise<TenantEntity | null>;
    /**
     * Finds a tenant by UUID — CROSS-TENANT.
     * Called during header-based resolution.
     */
    findRawById(id: string): Promise<TenantEntity | null>;
    /**
     * Finds tenant by email — CROSS-TENANT.
     * Used during signup to enforce unique email constraint.
     */
    findByEmail(email: string): Promise<TenantEntity | null>;
    /**
     * Lists all tenants — SUPERADMIN only.
     * Paginated; never exposed to tenant-level callers.
     */
    findAllTenants(page?: number, limit?: number, status?: TenantStatus, tier?: TenantTier): Promise<{
        data: TenantEntity[];
        total: number;
    }>;
    /**
     * Updates tenant status — CROSS-TENANT (superadmin + event-driven).
     */
    updateStatus(tenantId: string, status: TenantStatus): Promise<void>;
    /**
     * Updates tenant tier — CROSS-TENANT (superadmin).
     */
    updateTier(tenantId: string, tier: TenantTier): Promise<void>;
    /**
     * A tenant reading its own settings — SELF-TENANT (scoped).
     */
    findOwnSettings(tenantId: string): Promise<TenantEntity | null>;
    /**
     * Checks if a slug is already taken (case-insensitive).
     * Used during tenant creation to enforce uniqueness.
     */
    isSlugTaken(slug: string, excludeId?: string): Promise<boolean>;
}
//# sourceMappingURL=tenant.repository.d.ts.map