import type { JwtPayload } from '@spancle/types';
import { TenantService } from '../services/tenant.service';
import { CreateTenantDto, UpdateTenantDto, UpdateTenantSettingsDto, TenantStatusTransitionDto, ChangeTierDto } from '../dto/create-tenant.dto';
import type { TenantEntity } from '../entities/tenant.entity';
/**
 * TenantController — tenant lifecycle management.
 *
 * Route groups:
 *   POST   /tenants          → SUPER_ADMIN only
 *   GET    /tenants          → SUPER_ADMIN only
 *   GET    /tenants/:id      → SUPER_ADMIN or self (own tenantId)
 *   PATCH  /tenants/:id      → SUPER_ADMIN or TENANT_ADMIN (own)
 *   PATCH  /tenants/:id/settings → TENANT_ADMIN (own)
 *   POST   /tenants/:id/activate   → SUPER_ADMIN only
 *   POST   /tenants/:id/suspend    → SUPER_ADMIN only
 *   POST   /tenants/:id/terminate  → SUPER_ADMIN only
 *   PATCH  /tenants/:id/tier → SUPER_ADMIN only
 *
 * Guards applied at class level:
 *   JwtAuthGuard → TenantStatusGuard → PlanLimitGuard
 * Additional guards (RolesGuard) applied per endpoint.
 */
export declare class TenantController {
    private readonly tenantService;
    constructor(tenantService: TenantService);
    createTenant(dto: CreateTenantDto): Promise<TenantEntity>;
    listTenants(page?: string, limit?: string, status?: string, tier?: string): Promise<{
        data: TenantEntity[];
        total: number;
    }>;
    getTenant(id: string, user: JwtPayload): Promise<TenantEntity>;
    updateTenant(id: string, dto: UpdateTenantDto, user: JwtPayload): Promise<TenantEntity>;
    updateSettings(id: string, dto: UpdateTenantSettingsDto, user: JwtPayload): Promise<TenantEntity>;
    activate(id: string, user: JwtPayload): Promise<TenantEntity>;
    suspend(id: string, dto: TenantStatusTransitionDto, user: JwtPayload): Promise<TenantEntity>;
    terminate(id: string, dto: TenantStatusTransitionDto, user: JwtPayload): Promise<TenantEntity>;
    changeTier(id: string, dto: ChangeTierDto, user: JwtPayload): Promise<TenantEntity>;
}
//# sourceMappingURL=tenant.controller.d.ts.map