import { type EntityManager, type EntityTarget, type FindManyOptions, type ObjectLiteral, type SelectQueryBuilder } from 'typeorm';
import { Logger } from '@nestjs/common';
/**
 * TenantIsolationViolationError — thrown when a repository operation is
 * attempted without a valid tenantId. This is always an application bug,
 * not a user error. It should never surface in a production 4xx response.
 */
export declare class TenantIsolationViolationError extends Error {
    constructor(operation: string, entity: string);
}
/**
 * TenantScopedEntity — minimum interface for entities managed by
 * TenantAwareRepository. All tenant-scoped entities must satisfy this.
 */
export interface TenantScopedEntity extends ObjectLiteral {
    id: string;
    tenantId?: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}
/**
 * TenantAwareRepository<T> — abstract base repository.
 *
 * Architecture contract:
 *   1. Every read query appends WHERE tenantId = :tenantId
 *   2. Every write operation validates tenantId matches the authenticated tenant
 *   3. Hard deletes are prohibited — only softDelete() is exposed
 *   4. The raw TypeORM repo is private — subclasses cannot bypass isolation
 *   5. tenantId is resolved from three sources, in priority order:
 *      a. Explicit parameter (preferred — always pass this)
 *      b. CLS store (implicit propagation)
 *      c. Throws TenantIsolationViolationError
 *
 * Subclass example:
 *   @Injectable()
 *   export class BookingRepository extends TenantAwareRepository<BookingEntity> {
 *     constructor(@InjectDataSource() ds: DataSource) {
 *       super(BookingEntity, ds.manager);
 *     }
 *   }
 */
export declare abstract class TenantAwareRepository<T extends TenantScopedEntity> {
    private readonly entity;
    private readonly manager;
    protected readonly logger: Logger;
    private readonly repo;
    private readonly entityName;
    constructor(entity: EntityTarget<T>, manager: EntityManager);
    /**
     * Resolves tenantId from explicit param → CLS → throws.
     * All protected methods call this — never skip it.
     */
    protected resolveTenantId(explicitTenantId?: string): string;
    /**
     * Returns a QueryBuilder pre-scoped to the resolved tenantId.
     * Always use this as the entry point for custom queries in subclasses.
     *
     * Usage:
     *   const qb = this.scopedQb('b', tenantId);
     *   qb.andWhere('b.status = :status', { status });
     *   return qb.getMany();
     */
    protected scopedQb(alias: string, tenantId?: string): SelectQueryBuilder<T>;
    /**
     * Returns a QueryBuilder scoped to tenant WITHOUT the isDeleted filter.
     * Use only for admin/audit queries that need to see soft-deleted records.
     */
    protected scopedQbWithDeleted(alias: string, tenantId?: string): SelectQueryBuilder<T>;
    findById(id: string, tenantId?: string): Promise<T | null>;
    findByIdOrFail(id: string, tenantId?: string): Promise<T>;
    findAll(tenantId?: string, options?: Omit<FindManyOptions<T>, 'where'>): Promise<T[]>;
    count(tenantId?: string): Promise<number>;
    existsById(id: string, tenantId?: string): Promise<boolean>;
    insert(data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isDeleted'> & Partial<Pick<T, 'id'>>, tenantId?: string): Promise<T>;
    updateById(id: string, data: Partial<Omit<T, 'id' | 'tenantId' | 'createdAt' | 'isDeleted'>>, tenantId?: string): Promise<T>;
    /**
     * Soft delete — sets isDeleted=true and deletedAt=now.
     * Hard deletes are never exposed through this base class.
     */
    softDelete(id: string, tenantId?: string): Promise<void>;
    /**
     * Bulk soft delete by a set of ids.
     * All ids must belong to the resolved tenant.
     */
    softDeleteMany(ids: string[], tenantId?: string): Promise<number>;
    findPaginated(tenantId?: string, page?: number, limit?: number, alias?: string): Promise<{
        data: T[];
        total: number;
    }>;
    /**
     * Exposes the underlying EntityManager for complex multi-table operations.
     * The caller is responsible for including tenantId in all queries.
     * Use only in subclasses — this should never be called from service layer.
     */
    get entityManager(): EntityManager;
}
//# sourceMappingURL=tenant-aware.repository.d.ts.map