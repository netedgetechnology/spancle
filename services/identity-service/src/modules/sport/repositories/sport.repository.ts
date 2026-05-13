import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { SportEntity, type SportStatus } from '../entities/sport.entity';

@Injectable()
export class SportRepository extends TenantAwareRepository<SportEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(SportEntity, dataSource.manager);
  }

  async findBySlug(slug: string, tenantId: string): Promise<SportEntity | null> {
    return this.scopedQb('s', tenantId)
      .andWhere('s.slug = :slug', { slug })
      .getOne();
  }

  async findByStatus(status: SportStatus, tenantId: string): Promise<SportEntity[]> {
    return this.scopedQb('s', tenantId)
      .andWhere('s.status = :status', { status })
      .orderBy('s.sortOrder', 'ASC')
      .addOrderBy('s.name', 'ASC')
      .getMany();
  }

  /**
   * Returns all sports assigned to a specific branch (via sport_branches join).
   * Only active sports are returned.
   */
  async findByBranch(branchId: string, tenantId: string): Promise<SportEntity[]> {
    return this.scopedQb('s', tenantId)
      .innerJoin(
        'sport_branches',
        'sb',
        'sb.sport_id = s.id AND sb.branch_id = :branchId AND sb.tenant_id = :tenantId AND sb.is_deleted = false',
        { branchId, tenantId },
      )
      .andWhere('s.status = :status', { status: 'active' })
      .orderBy('s.sortOrder', 'ASC')
      .getMany();
  }

  async isSlugTaken(
    slug:      string,
    tenantId:  string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.scopedQb('s', tenantId)
      .andWhere('s.slug = :slug', { slug });

    if (excludeId) {
      qb.andWhere('s.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  async countByStatus(tenantId: string): Promise<Record<SportStatus, number>> {
    const rows = await this.scopedQb('s', tenantId)
      .select('s.status', 'status')
      .addSelect('COUNT(s.id)::int', 'count')
      .groupBy('s.status')
      .getRawMany<{ status: SportStatus; count: string }>();

    const counts: Record<SportStatus, number> = { active: 0, inactive: 0 };
    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }
    return counts;
  }
}
