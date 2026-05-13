import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TenantAwareRepository,
} from '../../../common/repositories/tenant-aware.repository';
import { BranchEntity, type BranchStatus } from '../entities/branch.entity';

@Injectable()
export class BranchRepository extends TenantAwareRepository<BranchEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(BranchEntity, dataSource.manager);
  }

  async findBySlug(slug: string, tenantId: string): Promise<BranchEntity | null> {
    return this.scopedQb('b', tenantId)
      .andWhere('b.slug = :slug', { slug })
      .getOne();
  }

  async findByStatus(
    status: BranchStatus,
    tenantId: string,
  ): Promise<BranchEntity[]> {
    return this.scopedQb('b', tenantId)
      .andWhere('b.status = :status', { status })
      .orderBy('b.sortOrder', 'ASC')
      .addOrderBy('b.name', 'ASC')
      .getMany();
  }

  async findByManager(
    managerUserId: string,
    tenantId: string,
  ): Promise<BranchEntity[]> {
    return this.scopedQb('b', tenantId)
      .andWhere('b.managerUserId = :managerUserId', { managerUserId })
      .orderBy('b.sortOrder', 'ASC')
      .getMany();
  }

  async isSlugTaken(
    slug: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.scopedQb('b', tenantId)
      .andWhere('b.slug = :slug', { slug });

    if (excludeId) {
      qb.andWhere('b.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  async countByStatus(tenantId: string): Promise<Record<BranchStatus, number>> {
    const rows = await this.scopedQb('b', tenantId)
      .select('b.status', 'status')
      .addSelect('COUNT(b.id)::int', 'count')
      .groupBy('b.status')
      .getRawMany<{ status: BranchStatus; count: string }>();

    const initial: Record<BranchStatus, number> = {
      active: 0, inactive: 0, suspended: 0, archived: 0,
    };

    return rows.reduce((acc, r) => {
      acc[r.status] = Number(r.count);
      return acc;
    }, initial);
  }
}
