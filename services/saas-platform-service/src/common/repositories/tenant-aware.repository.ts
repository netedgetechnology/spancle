/**
 * Minimal TenantAwareRepository for saas-platform-service.
 * All queries require an explicit tenantId — no CLS fallback needed here.
 */
import {
  type DataSource,
  type EntityManager,
  type EntityTarget,
  type ObjectLiteral,
  type SelectQueryBuilder,
} from 'typeorm';
import { Logger, NotFoundException } from '@nestjs/common';

export interface TenantScopedEntity extends ObjectLiteral {
  id:        string;
  tenantId?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export abstract class TenantAwareRepository<T extends TenantScopedEntity> {
  protected readonly logger: Logger;
  protected readonly entityName: string;

  constructor(
    protected readonly entity:  EntityTarget<T>,
    protected readonly entityManager: EntityManager,
  ) {
    this.entityName = typeof entity === 'function' ? entity.name : String(entity);
    this.logger     = new Logger(this.entityName + 'Repository');
  }

  // ── Scoped query builder ────────────────────────────────────────────────────

  protected scopedQb(alias: string, tenantId: string): SelectQueryBuilder<T> {
    return this.entityManager
      .createQueryBuilder<T>(this.entity, alias)
      .where(`${alias}.tenantId = :tenantId`, { tenantId })
      .andWhere(`${alias}.isDeleted = false`);
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  async findAll(tenantId: string): Promise<T[]> {
    return this.scopedQb('e', tenantId).getMany();
  }

  async findById(id: string, tenantId: string): Promise<T | null> {
    return this.scopedQb('e', tenantId)
      .andWhere('e.id = :id', { id })
      .getOne();
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<T> {
    const entity = await this.findById(id, tenantId);
    if (!entity) {
      throw new NotFoundException(`${this.entityName} ${id} not found`);
    }
    return entity;
  }

  async count(tenantId: string): Promise<number> {
    return this.scopedQb('e', tenantId).getCount();
  }

  // ── Write ───────────────────────────────────────────────────────────────────

  async insert(data: Partial<T>, tenantId: string): Promise<T> {
    const row = this.entityManager.create(this.entity, {
      ...data,
      tenantId,
    } as unknown as T);
    return this.entityManager.save(this.entity, row);
  }

  async updateById(id: string, data: Partial<T>, tenantId: string): Promise<T> {
    await this.entityManager
      .createQueryBuilder()
      .update(this.entity)
      .set({ ...data, updatedAt: new Date() } as object)
      .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
      .execute();
    return this.findByIdOrFail(id, tenantId);
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(this.entity)
      .set({ isDeleted: true, deletedAt: new Date() } as object)
      .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
      .execute();
  }
}
