import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { BlogCategoryEntity } from '../entities/blog-category.entity';

@Injectable()
export class BlogCategoryRepository extends TenantAwareRepository<BlogCategoryEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(BlogCategoryEntity, dataSource.manager);
  }

  async findBySlug(slug: string, tenantId: string): Promise<BlogCategoryEntity | null> {
    return this.scopedQb('bc', tenantId)
      .andWhere('bc.slug = :slug', { slug })
      .getOne();
  }

  async isSlugTaken(slug: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const qb = this.scopedQb('bc', tenantId).andWhere('bc.slug = :slug', { slug });
    if (excludeId) qb.andWhere('bc.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }

  /**
   * Returns post count per category for the admin UI.
   * Groups published posts by categoryId.
   */
  async getPostCounts(tenantId: string): Promise<Record<string, number>> {
    const rows = await this.entityManager
      .createQueryBuilder()
      .select('b.categoryId', 'categoryId')
      .addSelect('COUNT(b.id)', 'count')
      .from('cms_blog_posts', 'b')
      .where('b.tenantId = :tenantId AND b.isDeleted = false AND b.status = :status', {
        tenantId,
        status: 'published',
      })
      .groupBy('b.categoryId')
      .getRawMany<{ categoryId: string; count: string }>();

    return rows.reduce<Record<string, number>>((acc, row) => {
      if (row.categoryId) acc[row.categoryId] = Number(row.count);
      return acc;
    }, {});
  }
}
