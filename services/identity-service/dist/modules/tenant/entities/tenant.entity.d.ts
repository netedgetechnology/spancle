import type { TenantSettings, TenantStatus, TenantTier } from '@spancle/types';
/**
 * TenantEntity — the root aggregate for multi-tenancy.
 *
 * Note on RLS: PostgreSQL Row-Level Security policies reference the
 * `tenant_id` column. The policy is created in the migration:
 *
 *   CREATE POLICY tenant_isolation ON <table>
 *     USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
 *
 * This entity is NOT itself RLS-protected (it IS the tenant registry).
 * All other entities reference this via their tenantId FK.
 *
 * `slug` is the URL-safe subdomain identifier (immutable after creation).
 * `settings` is JSONB — allows per-tenant configuration without schema migration.
 */
export declare class TenantEntity {
    id: string;
    name: string;
    /**
     * Immutable URL-safe identifier: 'acme-sports' → acme-sports.app.spancle.io
     * Lowercase alphanumeric + hyphens only. Validated at creation, never updated.
     */
    slug: string;
    status: TenantStatus;
    tier: TenantTier;
    email: string;
    phone: string | null;
    /**
     * JSONB settings column — per-tenant configuration.
     * Defaults applied in TenantService.create() from TenantSettingsSchema defaults.
     */
    settings: TenantSettings;
    logoUrl: string | null;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
//# sourceMappingURL=tenant.entity.d.ts.map