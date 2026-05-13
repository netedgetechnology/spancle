import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { SportBranchEntity } from '../entities/sport-branch.entity';

@Injectable()
export class SportBranchRepository extends TenantAwareRepository<SportBranchEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(SportBranchEntity, dataSource.manager);
  }

  /**
   * Returns all active branch mappings for a sport.
   */
  async findBySport(sportId: string, tenantId: string): Promise<SportBranchEntity[]> {
    return this.scopedQb('sb', tenantId)
      .andWhere('sb.sportId = :sportId', { sportId })
      .orderBy('sb.sortOrder', 'ASC')
      .getMany();
  }

  /**
   * Returns all active sport mappings for a branch.
   */
  async findByBranch(branchId: string, tenantId: string): Promise<SportBranchEntity[]> {
    return this.scopedQb('sb', tenantId)
      .andWhere('sb.branchId = :branchId', { branchId })
      .orderBy('sb.sortOrder', 'ASC')
      .getMany();
  }

  /**
   * Returns the branchIds currently mapped to a sport (non-deleted only).
   */
  async getBranchIdsForSport(sportId: string, tenantId: string): Promise<string[]> {
    const rows = await this.scopedQb('sb', tenantId)
      .select('sb.branchId', 'branchId')
      .andWhere('sb.sportId = :sportId', { sportId })
      .getRawMany<{ branchId: string }>();

    return rows.map((r) => r.branchId);
  }

  /**
   * Replace-strategy assignment — atomically replaces the full set of
   * branch mappings for a sport.
   *
   * Steps:
   *   1. Soft-delete all existing mappings for this sport
   *   2. Insert new mappings with sortOrder from array position
   *
   * Both steps operate under the tenantId scope.
   */
  async replaceBranchMappings(
    sportId:   string,
    branchIds: string[],
    tenantId:  string,
  ): Promise<void> {
    // Step 1: soft-delete all current mappings
    await this.entityManager
      .createQueryBuilder()
      .update(SportBranchEntity)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where('sportId = :sportId AND tenantId = :tenantId AND isDeleted = false', {
        sportId,
        tenantId,
      })
      .execute();

    if (branchIds.length === 0) return;

    // Step 2: insert new mappings
    const entities = branchIds.map((branchId, i) =>
      this.entityManager.create(SportBranchEntity, {
        tenantId,
        sportId,
        branchId,
        sortOrder: i,
        isDeleted: false,
      }),
    );

    await this.entityManager.save(SportBranchEntity, entities);
  }

  /**
   * Soft-deletes all branch mappings for a sport.
   * Called before sport deletion to prevent orphaned join rows.
   */
  async deleteAllForSport(sportId: string, tenantId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(SportBranchEntity)
      .set({
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where('sportId = :sportId AND tenantId = :tenantId AND isDeleted = false', {
        sportId,
        tenantId,
      })
      .execute();
  }

  async existsMapping(
    sportId:  string,
    branchId: string,
    tenantId: string,
  ): Promise<boolean> {
    return this.scopedQb('sb', tenantId)
      .andWhere('sb.sportId = :sportId AND sb.branchId = :branchId', {
        sportId,
        branchId,
      })
      .getCount()
      .then((c) => c > 0);
  }
}
