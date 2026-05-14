import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { MediaAssetEntity, type MediaAssetType } from '../entities/media-asset.entity';

@Injectable()
export class MediaAssetRepository extends TenantAwareRepository<MediaAssetEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(MediaAssetEntity, dataSource.manager);
  }

  async findByType(assetType: MediaAssetType, tenantId: string, page = 1, limit = 20): Promise<{ data: MediaAssetEntity[]; total: number }> {
    const [data, total] = await this.scopedQb('m', tenantId)
      .andWhere('m.assetType = :assetType', { assetType })
      .orderBy('m.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total };
  }

  async findOrphaned(tenantId: string): Promise<MediaAssetEntity[]> {
    return this.scopedQb('m', tenantId)
      .andWhere('m.referenceCount = 0')
      .orderBy('m.createdAt', 'ASC')
      .getMany();
  }

  async adjustReferenceCount(id: string, tenantId: string, delta: 1 | -1): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(MediaAssetEntity)
      .set({ referenceCount: () => `GREATEST(0, "reference_count" + ${delta})` })
      .where('id = :id AND tenantId = :tenantId', { id, tenantId })
      .execute();
  }

  async findByStoredName(storedName: string, tenantId: string): Promise<MediaAssetEntity | null> {
    return this.scopedQb('m', tenantId)
      .andWhere('m.storedName = :storedName', { storedName })
      .getOne();
  }
  async findPaginated(
    tenantId: string,
    page = 1,
    limit = 20,
    alias = 'm',
  ): Promise<{ data: MediaAssetEntity[]; total: number }> {
    const [data, total] = await this.scopedQb(alias, tenantId)
      .orderBy(`${alias}.createdAt`, 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { data, total };
  }

}
