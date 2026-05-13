import {
  type DataSource,
  type EntityManager,
  type EntityTarget,
  type FindManyOptions,
  type FindOneOptions,
  type ObjectLiteral,
  type Repository,
  type SelectQueryBuilder,
  type UpdateResult,
  type DeleteResult,
} from 'typeorm';
import { Logger, NotFoundException } from '@nestjs/common';
import { TenantClsContext } from '../context/tenant-cls.context';
import type { TenantContextRuntime } from '../../modules/tenant/types/tenant-context.types';

/**
 * TenantIsolationViolationError — thrown when a repository operation is
 * attempted without a valid tenantId. This is always an application bug,
 * not a user error. It should never surface in a production 4xx response.
 */
export class TenantIsolationViolationError extends Error {
  constructor(operation: string, entity: string) {
    super(
      `Tenant isolation violation: attempted "${operation}" on "${entity}" ` +
      'without a tenantId. This is a programming error — all queries must ' +
      'be scoped to a tenant.',
    );
    this.name = 'TenantIsolationViolationError';
  }
}

/**
 * TenantScopedEntity — minimum interface for entities managed by
 * TenantAwareRepository. All tenant-scoped entities must satisfy this.
 */
export interface TenantScopedEntity extends ObjectLiteral {
  id:        string;
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
export abstract class TenantAwareRepository<T extends TenantScopedEntity> {
  protected readonly logger: Logger;
  private readonly repo:     Repository<T>;
  private readonly entityName: string;

  constructor(
    private readonly entity: EntityTarget<T>,
    private readonly manager: EntityManager,
  ) {
    this.repo       = manager.getRepository(entity);
    this.entityName = typeof entity === 'function' ? entity.name : String(entity);
    this.logger     = new Logger(`TenantRepo:${this.entityName}`);
  }

  // ── Tenant resolution ──────────────────────────────────────────────────────

  /**
   * Resolves tenantId from explicit param → CLS → throws.
   * All protected methods call this — never skip it.
   */
  protected resolveTenantId(explicitTenantId?: string): string {
    if (explicitTenantId && explicitTenantId.trim() !== '') {
      return explicitTenantId;
    }

    const clsCtx = TenantClsContext.get();
    if (clsCtx?.tenantId) {
      return clsCtx.tenantId;
    }

    throw new TenantIsolationViolationError('resolveTenantId', this.entityName);
  }

  /**
   * Returns a QueryBuilder pre-scoped to the resolved tenantId.
   * Always use this as the entry point for custom queries in subclasses.
   *
   * Usage:
   *   const qb = this.scopedQb('b', tenantId);
   *   qb.andWhere('b.status = :status', { status });
   *   return qb.getMany();
   */
  protected scopedQb(alias: string, tenantId?: string): SelectQueryBuilder<T> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId: resolvedTenantId })
      .andWhere(`${alias}.isDeleted = :isDeleted`, { isDeleted: false });
  }

  /**
   * Returns a QueryBuilder scoped to tenant WITHOUT the isDeleted filter.
   * Use only for admin/audit queries that need to see soft-deleted records.
   */
  protected scopedQbWithDeleted(alias: string, tenantId?: string): SelectQueryBuilder<T> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    return this.repo
      .createQueryBuilder(alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId: resolvedTenantId });
  }

  // ── Read operations ────────────────────────────────────────────────────────

  async findById(id: string, tenantId?: string): Promise<T | null> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    return this.repo.findOne({
      where: {
        id,
        tenantId: resolvedTenantId,
        isDeleted: false,
      } as unknown as FindOneOptions<T>['where'],
    });
  }

  async findByIdOrFail(id: string, tenantId?: string): Promise<T> {
    const entity = await this.findById(id, tenantId);

    if (!entity) {
      throw new NotFoundException(
        `${this.entityName} with id "${id}" not found`,
      );
    }

    return entity;
  }

  async findAll(
    tenantId?: string,
    options?: Omit<FindManyOptions<T>, 'where'>,
  ): Promise<T[]> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    return this.repo.find({
      ...options,
      where: {
        tenantId: resolvedTenantId,
        isDeleted: false,
      } as unknown as FindManyOptions<T>['where'],
    });
  }

  async count(tenantId?: string): Promise<number> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    return this.repo.count({
      where: {
        tenantId: resolvedTenantId,
        isDeleted: false,
      } as unknown as FindManyOptions<T>['where'],
    });
  }

  async existsById(id: string, tenantId?: string): Promise<boolean> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    const count = await this.repo.count({
      where: {
        id,
        tenantId: resolvedTenantId,
        isDeleted: false,
      } as unknown as FindManyOptions<T>['where'],
    });

    return count > 0;
  }

  // ── Write operations ───────────────────────────────────────────────────────

  async insert(
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'isDeleted'> &
      Partial<Pick<T, 'id'>>,
    tenantId?: string,
  ): Promise<T> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    // Assert the data's tenantId matches the resolved context
    if ((data as Partial<T>).tenantId && (data as Partial<T>).tenantId !== resolvedTenantId) {
      throw new TenantIsolationViolationError('insert:tenantId_mismatch', this.entityName);
    }

    const entity = this.repo.create({
      ...data,
      tenantId:  resolvedTenantId,
      isDeleted: false,
    } as unknown as T);

    return this.repo.save(entity);
  }

  async updateById(
    id:       string,
    data:     Partial<Omit<T, 'id' | 'tenantId' | 'createdAt' | 'isDeleted'>>,
    tenantId?: string,
  ): Promise<T> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    // Prevent tenantId mutation via update
    if ('tenantId' in data) {
      throw new TenantIsolationViolationError('update:tenantId_mutation', this.entityName);
    }

    const result: UpdateResult = await this.repo
      .createQueryBuilder()
      .update()
      .set({ ...data, updatedAt: new Date() } as unknown as T)
      .where('id = :id AND tenantId = :tenantId AND isDeleted = :isDeleted', {
        id,
        tenantId: resolvedTenantId,
        isDeleted: false,
      })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException(
        `${this.entityName} with id "${id}" not found or does not belong to tenant`,
      );
    }

    return this.findByIdOrFail(id, resolvedTenantId);
  }

  /**
   * Soft delete — sets isDeleted=true and deletedAt=now.
   * Hard deletes are never exposed through this base class.
   */
  async softDelete(id: string, tenantId?: string): Promise<void> {
    const resolvedTenantId = this.resolveTenantId(tenantId);

    const result: UpdateResult = await this.repo
      .createQueryBuilder()
      .update()
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      } as unknown as T)
      .where('id = :id AND tenantId = :tenantId AND isDeleted = :isDeleted', {
        id,
        tenantId: resolvedTenantId,
        isDeleted: false,
      })
      .execute();

    if (result.affected === 0) {
      throw new NotFoundException(
        `${this.entityName} with id "${id}" not found`,
      );
    }

    this.logger.debug(
      `Soft deleted ${this.entityName} id=${id} tenantId=${resolvedTenantId}`,
    );
  }

  /**
   * Bulk soft delete by a set of ids.
   * All ids must belong to the resolved tenant.
   */
  async softDeleteMany(ids: string[], tenantId?: string): Promise<number> {
    if (ids.length === 0) return 0;

    const resolvedTenantId = this.resolveTenantId(tenantId);

    const result: UpdateResult = await this.repo
      .createQueryBuilder()
      .update()
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      } as unknown as T)
      .where('id IN (:...ids) AND tenantId = :tenantId AND isDeleted = :isDeleted', {
        ids,
        tenantId: resolvedTenantId,
        isDeleted: false,
      })
      .execute();

    this.logger.debug(
      `Bulk soft deleted ${result.affected ?? 0} ${this.entityName} records — tenantId=${resolvedTenantId}`,
    );

    return result.affected ?? 0;
  }

  // ── Pagination helper ──────────────────────────────────────────────────────

  async findPaginated(
    tenantId?: string,
    page   = 1,
    limit  = 20,
    alias  = 'entity',
  ): Promise<{ data: T[]; total: number }> {
    const qb = this.scopedQb(alias, tenantId);

    const [data, total] = await qb
      .orderBy(`${alias}.createdAt`, 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  // ── Raw access for complex queries ─────────────────────────────────────────

  /**
   * Exposes the underlying EntityManager for complex multi-table operations.
   * The caller is responsible for including tenantId in all queries.
   * Use only in subclasses — this should never be called from service layer.
   */
  get entityManager(): EntityManager {
    return this.manager;
  }
}
