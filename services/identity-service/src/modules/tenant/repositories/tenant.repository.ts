import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
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
@Injectable()
export class TenantRepository extends TenantAwareRepository<TenantEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(TenantEntity, dataSource.manager);
  }

  // ── Cross-tenant operations (resolution + superadmin) ─────────────────────

  /**
   * Finds a tenant by slug — CROSS-TENANT.
   * Called during subdomain resolution before context is established.
   */
  async findBySlug(slug: string): Promise<TenantEntity | null> {
    return this.entityManager
      .getRepository(TenantEntity)
      .findOne({ where: { slug, isDeleted: false } });
  }

  /**
   * Finds a tenant by UUID — CROSS-TENANT.
   * Called during header-based resolution.
   */
  async findRawById(id: string): Promise<TenantEntity | null> {
    return this.entityManager
      .getRepository(TenantEntity)
      .findOne({ where: { id, isDeleted: false } });
  }

  /**
   * Finds tenant by email — CROSS-TENANT.
   * Used during signup to enforce unique email constraint.
   */
  async findByEmail(email: string): Promise<TenantEntity | null> {
    // Exclude terminated tenants — they should not block email reuse
    return this.entityManager
      .getRepository(TenantEntity)
      .createQueryBuilder('t')
      .where('t.email = :email', { email })
      .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('t.status != :terminated', { terminated: 'terminated' })
      .getOne();
  }

  /**
   * Lists all tenants — SUPERADMIN only.
   * Paginated; never exposed to tenant-level callers.
   */
  async findAllTenants(
    page  = 1,
    limit = 20,
    status?: TenantStatus,
    tier?:   TenantTier,
  ): Promise<{ data: TenantEntity[]; total: number }> {
    const qb = this.entityManager
      .getRepository(TenantEntity)
      .createQueryBuilder('t')
      .where('t.isDeleted = :isDeleted', { isDeleted: false });

    if (status) qb.andWhere('t.status = :status', { status });
    if (tier)   qb.andWhere('t.tier = :tier',   { tier });

    const [data, total] = await qb
      .orderBy('t.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  /**
   * Updates tenant status — CROSS-TENANT (superadmin + event-driven).
   */
  async updateStatus(
    tenantId: string,
    status:   TenantStatus,
  ): Promise<void> {
    await this.entityManager
      .getRepository(TenantEntity)
      .update({ id: tenantId }, { status, updatedAt: new Date() });
  }

  /**
   * Updates tenant tier — CROSS-TENANT (superadmin).
   */
  async updateTier(tenantId: string, tier: TenantTier): Promise<void> {
    await this.entityManager
      .getRepository(TenantEntity)
      .update({ id: tenantId }, { tier, updatedAt: new Date() });
  }

  // ── Self-tenant operations (tenant reads own record) ───────────────────────

  /**
   * A tenant reading its own settings — SELF-TENANT (scoped).
   */
  async findOwnSettings(tenantId: string): Promise<TenantEntity | null> {
    return this.findRawById(tenantId);
  }

  /**
   * Checks if a slug is already taken (case-insensitive).
   * Ignores terminated tenants — they should not block slug reuse.
   * Used during tenant creation and slug availability check.
   */
  /**
   * Resolves a tenant by slug or email — ACTIVE ONLY.
   * Used by the public tenant finder (www.spancle.com/login).
   * Pending, suspended, and terminated tenants return null.
   */
  async findActiveBySlugOrEmail(
    q: string,
  ): Promise<TenantEntity | null> {
    const repo = this.entityManager.getRepository(TenantEntity);

    // Try slug match first
    const bySlug = await repo
      .createQueryBuilder('t')
      .where('LOWER(t.slug) = LOWER(:q)', { q })
      .andWhere('t.status = :status', { status: 'active' })
      .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();

    if (bySlug) return bySlug;

    // Fallback: email match
    return repo
      .createQueryBuilder('t')
      .where('LOWER(t.email) = LOWER(:q)', { q })
      .andWhere('t.status = :status', { status: 'active' })
      .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();
  }


  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const qb = this.entityManager
      .getRepository(TenantEntity)
      .createQueryBuilder('t')
      .where('LOWER(t.slug) = LOWER(:slug)', { slug })
      .andWhere('t.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('t.status != :terminated', { terminated: 'terminated' });

    if (excludeId) {
      qb.andWhere('t.id != :excludeId', { excludeId });
    }

    const count = await qb.getCount();
    return count > 0;
  }
}
