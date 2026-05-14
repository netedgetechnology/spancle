import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TenantAwareRepository,
} from '../../../common/repositories/tenant-aware.repository';
import { HomepageSectionEntity } from '../entities/homepage-section.entity';
import type { SectionType } from '../types/section-payload.types';

@Injectable()
export class HomepageSectionRepository
  extends TenantAwareRepository<HomepageSectionEntity> {

  constructor(@InjectDataSource() dataSource: DataSource) {
    super(HomepageSectionEntity, dataSource.manager);
  }

  /**
   * Returns all published, visible sections for a page in sortOrder.
   * Used by the public renderer.
   */
  async findPublishedByPage(
    pageId:   string,
    tenantId: string,
  ): Promise<HomepageSectionEntity[]> {
    return this.scopedQb('hs', tenantId)
      .andWhere('hs.pageId    = :pageId',    { pageId })
      .andWhere('hs.status    = :status',    { status: 'published' })
      .andWhere('hs.isVisible = :isVisible', { isVisible: true })
      .orderBy('hs.sortOrder', 'ASC')
      .getMany();
  }

  /**
   * Returns ALL sections for a page (all statuses).
   * Used by the admin editor.
   */
  async findAllByPage(
    pageId:   string,
    tenantId: string,
  ): Promise<HomepageSectionEntity[]> {
    return this.scopedQb('hs', tenantId)
      .andWhere('hs.pageId = :pageId', { pageId })
      .orderBy('hs.sortOrder', 'ASC')
      .getMany();
  }

  /**
   * Returns sections filtered by type — used to enforce section limits.
   */
  async findByPageAndType(
    pageId:      string,
    sectionType: SectionType,
    tenantId:    string,
  ): Promise<HomepageSectionEntity[]> {
    return this.scopedQb('hs', tenantId)
      .andWhere('hs.pageId      = :pageId',      { pageId })
      .andWhere('hs.sectionType = :sectionType', { sectionType })
      .orderBy('hs.sortOrder', 'ASC')
      .getMany();
  }

  /**
   * Returns the current max sortOrder for a page.
   * Used to append a new section at the end.
   */
  async getMaxSortOrder(pageId: string, tenantId: string): Promise<number> {
    const result = await this.scopedQb('hs', tenantId)
      .andWhere('hs.pageId = :pageId', { pageId })
      .select('MAX(hs.sortOrder)', 'maxOrder')
      .getRawOne<{ maxOrder: string | null }>();

    return result?.maxOrder !== null ? Number(result?.maxOrder) : -1;
  }

  /**
   * Bulk-updates sortOrder for reordering — uses a single transaction.
   * All section IDs must belong to tenantId (validated in service).
   */
  async bulkUpdateSortOrder(
    updates:  Array<{ id: string; sortOrder: number }>,
    tenantId: string,
  ): Promise<void> {
    await this.entityManager.transaction(async (em) => {
      for (const { id, sortOrder } of updates) {
        await em
          .createQueryBuilder()
          .update(HomepageSectionEntity)
          .set({ sortOrder, updatedAt: new Date() })
          .where('id = :id AND tenantId = :tenantId AND isDeleted = false', {
            id,
            tenantId,
          })
          .execute();
      }
    });
  }

  /**
   * Updates a single section by id within a tenant.
   */
  async updateById(
    id:       string,
    data:     Partial<HomepageSectionEntity>,
    tenantId: string,
  ): Promise<HomepageSectionEntity> {
    await this.entityManager
      .createQueryBuilder()
      .update(HomepageSectionEntity)
      .set({ ...data, updatedAt: new Date() })
      .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
      .execute();

    const updated = await this.scopedQb('hs', tenantId)
      .andWhere('hs.id = :id', { id })
      .getOne();

    if (!updated) {
      const { NotFoundException } = await import('@nestjs/common');
      throw new NotFoundException(`HomepageSection ${id} not found`);
    }
    return updated;
  }

  /**
   * Soft-deletes a single section by id within a tenant.
   */
  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(HomepageSectionEntity)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where('id = :id AND tenantId = :tenantId AND isDeleted = false', { id, tenantId })
      .execute();
  }

  /**
   * Soft-deletes all sections for a page — used when a page is deleted.
   */
  async softDeleteAllByPage(pageId: string, tenantId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(HomepageSectionEntity)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where(
        'pageId = :pageId AND tenantId = :tenantId AND isDeleted = false',
        { pageId, tenantId },
      )
      .execute();
  }
}
