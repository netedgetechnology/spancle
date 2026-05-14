import { EventEmitter2 } from '@nestjs/event-emitter';
import type { CreateTenantDto, TenantSettings, TenantStatus, TenantTier } from '@spancle/types';
import { TenantRepository } from '../repositories/tenant.repository';
import { TenantEntity } from '../entities/tenant.entity';
import type { PlanLimits } from '../types/plan-limits.types';
/**
 * TenantService — tenant lifecycle management.
 *
 * Exposes:
 *   - CRUD operations for the superadmin portal
 *   - Resolution methods used by TenantResolverMiddleware
 *   - Plan limit resolution for TenantContextRuntime construction
 *   - Status transition methods with event emission
 */
export declare class TenantService {
    private readonly tenantRepository;
    private readonly eventEmitter;
    private readonly logger;
    constructor(tenantRepository: TenantRepository, eventEmitter: EventEmitter2);
    findById(id: string): Promise<TenantEntity | null>;
    findBySlug(slug: string): Promise<TenantEntity | null>;
    /**
     * Resolves plan limits for a given tier.
     * Falls back to 'free' limits if tier is unrecognised.
     * Sprint 3: allow per-tenant limit overrides stored in JSONB.
     */
    resolvePlanLimits(tier: TenantTier): PlanLimits;
    create(dto: CreateTenantDto): Promise<TenantEntity>;
    findAll(page?: number, limit?: number, status?: TenantStatus, tier?: TenantTier): Promise<{
        data: TenantEntity[];
        total: number;
    }>;
    getById(tenantId: string): Promise<TenantEntity>;
    update(tenantId: string, dto: Partial<Pick<CreateTenantDto, 'name' | 'email' | 'phone'>>): Promise<TenantEntity>;
    updateSettings(tenantId: string, settings: Partial<TenantSettings>): Promise<TenantEntity>;
    activate(tenantId: string, actorId: string): Promise<TenantEntity>;
    suspend(tenantId: string, actorId: string, reason: string): Promise<TenantEntity>;
    terminate(tenantId: string, actorId: string, reason: string): Promise<TenantEntity>;
    changeTier(tenantId: string, newTier: TenantTier, actorId: string): Promise<TenantEntity>;
    private transitionStatus;
}
//# sourceMappingURL=tenant.service.d.ts.map