import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { CourtEntity, type CourtStatus } from '../entities/court.entity';

@Injectable()
export class CourtRepository extends TenantAwareRepository<CourtEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(CourtEntity, dataSource.manager);
  }

  async findByBranch(
    branchId: string,
    tenantId: string,
    status?: CourtStatus,
  ): Promise<CourtEntity[]> {
    const qb = this.scopedQb('c', tenantId)
      .andWhere('c.branchId = :branchId', { branchId });

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    return qb
      .orderBy('c.courtNumber', 'ASC', 'NULLS LAST')
      .addOrderBy('c.sortOrder', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .getMany();
  }

  async findBySport(
    sportId:  string,
    tenantId: string,
    branchId?: string,
  ): Promise<CourtEntity[]> {
    const qb = this.scopedQb('c', tenantId)
      .andWhere('c.sportId = :sportId', { sportId });

    if (branchId) {
      qb.andWhere('c.branchId = :branchId', { branchId });
    }

    return qb
      .orderBy('c.branchId', 'ASC')
      .addOrderBy('c.courtNumber', 'ASC', 'NULLS LAST')
      .getMany();
  }

  async findByStatus(status: CourtStatus, tenantId: string): Promise<CourtEntity[]> {
    return this.scopedQb('c', tenantId)
      .andWhere('c.status = :status', { status })
      .orderBy('c.branchId', 'ASC')
      .addOrderBy('c.courtNumber', 'ASC', 'NULLS LAST')
      .getMany();
  }

  async isNameTakenInBranch(
    name:      string,
    branchId:  string,
    tenantId:  string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.scopedQb('c', tenantId)
      .andWhere('c.branchId = :branchId', { branchId })
      .andWhere('LOWER(c.name) = LOWER(:name)', { name });

    if (excludeId) {
      qb.andWhere('c.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  /** Returns all names currently in use for a branch — used by bulk generation */
  async getExistingNamesForBranch(
    branchId: string,
    tenantId: string,
  ): Promise<Set<string>> {
    const rows = await this.scopedQb('c', tenantId)
      .select('LOWER(c.name)', 'name')
      .andWhere('c.branchId = :branchId', { branchId })
      .getRawMany<{ name: string }>();

    return new Set(rows.map((r) => r.name));
  }

  async countByBranch(
    branchId: string,
    tenantId: string,
  ): Promise<number> {
    return this.scopedQb('c', tenantId)
      .andWhere('c.branchId = :branchId', { branchId })
      .getCount();
  }

  async countByStatus(tenantId: string): Promise<Record<CourtStatus, number>> {
    const rows = await this.scopedQb('c', tenantId)
      .select('c.status', 'status')
      .addSelect('COUNT(c.id)::int', 'count')
      .groupBy('c.status')
      .getRawMany<{ status: CourtStatus; count: string }>();

    const counts: Record<CourtStatus, number> = {
      available: 0, unavailable: 0, maintenance: 0, retired: 0,
    };

    for (const row of rows) {
      counts[row.status] = Number(row.count);
    }

    return counts;
  }

  /** Returns count of courts in maintenance across all branches */
  async countInMaintenance(tenantId: string): Promise<number> {
    return this.scopedQb('c', tenantId)
      .andWhere('c.status = :status', { status: 'maintenance' })
      .getCount();
  }
}
