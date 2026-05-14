/**
 * Minimal TenantAwareRepository for saas-platform-service.
 * All queries require an explicit tenantId — no CLS fallback needed here.
 */
import { type EntityManager, type EntityTarget, type ObjectLiteral, type SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
export interface TenantScopedEntity extends ObjectLiteral {
    id: string;
    tenantId?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
}
export declare abstract class TenantAwareRepository<T extends TenantScopedEntity> {
    protected readonly entity: EntityTarget<T>;
    protected readonly entityManager: EntityManager;
    protected readonly logger: Logger;
    protected readonly entityName: string;
    constructor(entity: EntityTarget<T>, entityManager: EntityManager);
    protected scopedQb(alias: string, tenantId: string): SelectQueryBuilder<T>;
    findAll(tenantId: string): Promise<T[]>;
    findById(id: string, tenantId: string): Promise<T | null>;
    findByIdOrFail(id: string, tenantId: string): Promise<T>;
    count(tenantId: string): Promise<number>;
    insert(data: Partial<T>, tenantId: string): Promise<T>;
    updateById(id: string, data: Partial<T>, tenantId: string): Promise<T>;
    softDelete(id: string, tenantId: string): Promise<void>;
}
//# sourceMappingURL=tenant-aware.repository.d.ts.map