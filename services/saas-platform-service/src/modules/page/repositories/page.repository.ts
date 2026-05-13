import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  TenantAwareRepository,
} from '../../../../common/repositories/tenant-aware.repository';
import { PageEntity, type PageStatus } from '../entities/page.entity';

@Injectable()
export class PageRepository extends TenantAwareRepository<PageEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(PageEntity, dataSource.manager);
  }

  async findBySlug(slug: string, tenantId: string): Promise<PageEntity | null> {
    return this.scopedQb('p', tenantId)
      .andWhere('p.slug = :slug', { slug })
      .getOne();
  }

  async findPublished(
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: PageEntity[]; total: number }> {
    const [data, total] = await this.scopedQb('p', tenantId)
      .andWhere('p.status = :status', { status: 'published' })
      .orderBy('p.sortOrder', 'ASC')
      .addOrderBy('p.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total };
  }

  async findByStatus(
    status: PageStatus,
    tenantId: string,
  ): Promise<PageEntity[]> {
    return this.scopedQb('p', tenantId)
      .andWhere('p.status = :status', { status })
      .orderBy('p.sortOrder', 'ASC')
      .getMany();
  }

  async findHomepage(tenantId: string): Promise<PageEntity | null> {
    return this.scopedQb('p', tenantId)
      .andWhere('p.isHomepage = :isHomepage', { isHomepage: true })
      .andWhere('p.status = :status', { status: 'published' })
      .getOne();
  }

  async isSlugTaken(
    slug: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<boolean> {
    const qb = this.scopedQb('p', tenantId)
      .andWhere('p.slug = :slug', { slug });

    if (excludeId) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  /** Clears isHomepage on all pages for the tenant before setting a new one */
  async clearHomepage(tenantId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(PageEntity)
      .set({ isHomepage: false })
      .where('tenantId = :tenantId AND isHomepage = true AND isDeleted = false', { tenantId })
      .execute();
  }
}
