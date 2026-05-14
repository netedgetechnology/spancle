import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackageEntity, type PackageStatus } from '../entities/package.entity';

/**
 * PackageRepository — global package definition repository.
 *
 * NOTE: Does NOT extend TenantAwareRepository — packages are
 * platform-global, not tenant-scoped. There is no tenantId filter.
 * Access is controlled at the controller layer by SuperAdminGuard.
 */
@Injectable()
export class PackageRepository {
  constructor(
    @InjectRepository(PackageEntity)
    private readonly repo: Repository<PackageEntity>,
  ) {}

  async create(data: Partial<PackageEntity>): Promise<PackageEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findAll(includeArchived = false): Promise<PackageEntity[]> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.isDeleted = :deleted', { deleted: false });

    if (!includeArchived) {
      qb.andWhere('p.status != :archived', { archived: 'archived' });
    }

    return qb.orderBy('p.sortOrder', 'ASC').getMany();
  }

  async findActive(): Promise<PackageEntity[]> {
    return this.repo.find({
      where: { status: 'active', isDeleted: false },
      order: { sortOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<PackageEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async findBySlug(slug: string): Promise<PackageEntity | null> {
    return this.repo.findOne({ where: { slug, isDeleted: false } });
  }

  async findByTierKey(tierKey: string): Promise<PackageEntity | null> {
    return this.repo.findOne({ where: { tierKey, isDeleted: false } });
  }

  async isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.slug = :slug AND p.isDeleted = false', { slug });

    if (excludeId) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  async isTierKeyTaken(tierKey: string, excludeId?: string): Promise<boolean> {
    const qb = this.repo
      .createQueryBuilder('p')
      .where('p.tierKey = :tierKey AND p.isDeleted = false', { tierKey });

    if (excludeId) {
      qb.andWhere('p.id != :excludeId', { excludeId });
    }

    return (await qb.getCount()) > 0;
  }

  async update(id: string, data: Partial<PackageEntity>): Promise<PackageEntity> {
    const existing = await this.repo.findOneOrFail({ where: { id } });
    const merged   = this.repo.merge(existing, data, { updatedAt: new Date() } as Partial<PackageEntity>);
    return this.repo.save(merged);
  }

  async updateStatus(id: string, status: PackageStatus): Promise<void> {
    const now     = new Date();
    const existing = await this.repo.findOneOrFail({ where: { id } });
    existing.status    = status;
    existing.updatedAt = now;

    if (status === 'active' && !existing.publishedAt) {
      existing.publishedAt = now;
    }
    if (status === 'deprecated') {
      existing.deprecatedAt = now;
    }

    await this.repo.save(existing);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update(
      { id },
      { isDeleted: true, deletedAt: new Date() },
    );
  }

  async count(status?: PackageStatus): Promise<number> {
    if (status) {
      return this.repo.count({ where: { status, isDeleted: false } });
    }
    return this.repo.count({ where: { isDeleted: false } });
  }
}
