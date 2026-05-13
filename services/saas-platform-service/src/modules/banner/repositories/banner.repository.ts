import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../../common/repositories/tenant-aware.repository';
import { BannerEntity, type BannerPlacement, type BannerStatus } from '../entities/banner.entity';

@Injectable()
export class BannerRepository extends TenantAwareRepository<BannerEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(BannerEntity, dataSource.manager);
  }

  async findByPlacement(placement: BannerPlacement, tenantId: string): Promise<BannerEntity[]> {
    const now = new Date();
    return this.scopedQb('ban', tenantId)
      .andWhere('ban.placement = :placement', { placement })
      .andWhere('ban.status = :status', { status: 'active' })
      .andWhere('(ban.activeFrom IS NULL OR ban.activeFrom <= :now)', { now })
      .andWhere('(ban.activeTo IS NULL OR ban.activeTo >= :now)', { now })
      .orderBy('ban.sortOrder', 'ASC')
      .getMany();
  }

  async findByStatus(status: BannerStatus, tenantId: string): Promise<BannerEntity[]> {
    return this.scopedQb('ban', tenantId)
      .andWhere('ban.status = :status', { status })
      .orderBy('ban.sortOrder', 'ASC')
      .getMany();
  }

  async findByKey(key: string, tenantId: string): Promise<BannerEntity | null> {
    return this.scopedQb('ban', tenantId)
      .andWhere('ban.key = :key', { key })
      .getOne();
  }
}
