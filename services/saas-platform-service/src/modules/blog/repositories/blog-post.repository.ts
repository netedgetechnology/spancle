import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { BlogPostEntity, type BlogPostStatus } from '../entities/blog-post.entity';

@Injectable()
export class BlogPostRepository extends TenantAwareRepository<BlogPostEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(BlogPostEntity, dataSource.manager);
  }

  async findBySlug(slug: string, tenantId: string): Promise<BlogPostEntity | null> {
    return this.scopedQb('b', tenantId)
      .andWhere('b.slug = :slug', { slug })
      .getOne();
  }

  async findByStatus(
    status: BlogPostStatus,
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: BlogPostEntity[]; total: number }> {
    const [data, total] = await this.scopedQb('b', tenantId)
      .andWhere('b.status = :status', { status })
      .orderBy('b.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total };
  }

  async findByCategory(
    categoryId: string,
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: BlogPostEntity[]; total: number }> {
    const [data, total] = await this.scopedQb('b', tenantId)
      .andWhere('b.categoryId = :categoryId', { categoryId })
      .andWhere('b.status = :status', { status: 'published' })
      .orderBy('b.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total };
  }

  /**
   * Returns all posts with status='scheduled' whose publishedAt has passed.
   * Called by the scheduler task (Sprint 2: @Cron every minute).
   */
  async findScheduledToPublish(): Promise<BlogPostEntity[]> {
    return this.entityManager
      .getRepository(BlogPostEntity)
      .createQueryBuilder('b')
      .where('b.status = :status', { status: 'scheduled' })
      .andWhere('b.publishedAt <= :now', { now: new Date() })
      .andWhere('b.isDeleted = false')
      .getMany();
  }

  /**
   * Returns featured posts for homepage/sidebar widgets.
   */
  async findFeatured(
    tenantId: string,
    limit = 5,
  ): Promise<BlogPostEntity[]> {
    return this.scopedQb('b', tenantId)
      .andWhere('b.isFeatured = true')
      .andWhere('b.status = :status', { status: 'published' })
      .orderBy('b.publishedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Full-text search across title, excerpt and tags.
   * Uses PostgreSQL ILIKE for case-insensitive substring match.
   */
  async searchByText(
    query: string,
    tenantId: string,
    page = 1,
    limit = 20,
  ): Promise<{ data: BlogPostEntity[]; total: number }> {
    const term = `%${query.replace(/[%_]/g, '\\$&')}%`;
    const [data, total] = await this.scopedQb('b', tenantId)
      .andWhere(
        '(b.title ILIKE :term OR b.excerpt ILIKE :term OR b.tags ILIKE :term)',
        { term },
      )
      .orderBy('b.publishedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total };
  }

  /**
   * Returns posts sharing the same category, excluding the source post.
   * Used for "Related posts" widgets.
   */
  async findRelated(
    postId:     string,
    categoryId: string,
    tenantId:   string,
    limit = 4,
  ): Promise<BlogPostEntity[]> {
    return this.scopedQb('b', tenantId)
      .andWhere('b.categoryId = :categoryId', { categoryId })
      .andWhere('b.id != :postId',            { postId })
      .andWhere('b.status = :status',         { status: 'published' })
      .orderBy('b.publishedAt', 'DESC')
      .take(limit)
      .getMany();
  }

  /**
   * Bulk-updates status for a list of post IDs.
   * Validates all IDs belong to the tenant before updating.
   */
  async bulkUpdateStatus(
    ids:      string[],
    status:   BlogPostStatus,
    tenantId: string,
  ): Promise<number> {
    if (ids.length === 0) return 0;

    const result = await this.entityManager
      .createQueryBuilder()
      .update(BlogPostEntity)
      .set({ status, updatedAt: new Date() })
      .where(
        'id IN (:...ids) AND tenantId = :tenantId AND isDeleted = false',
        { ids, tenantId },
      )
      .execute();

    return result.affected ?? 0;
  }

  async isSlugTaken(slug: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const qb = this.scopedQb('b', tenantId).andWhere('b.slug = :slug', { slug });
    if (excludeId) qb.andWhere('b.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }

  async incrementViewCount(id: string, tenantId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(BlogPostEntity)
      .set({ viewCount: () => '"view_count" + 1' })
      .where('id = :id AND tenantId = :tenantId', { id, tenantId })
      .execute();
  }
}
