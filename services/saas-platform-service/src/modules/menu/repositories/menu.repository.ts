import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../../common/repositories/tenant-aware.repository';
import { MenuEntity } from '../entities/menu.entity';

@Injectable()
export class MenuRepository extends TenantAwareRepository<MenuEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(MenuEntity, dataSource.manager);
  }

  async findByHandle(handle: string, tenantId: string): Promise<MenuEntity | null> {
    return this.scopedQb('m', tenantId)
      .andWhere('m.handle = :handle', { handle })
      .getOne();
  }

  async isHandleTaken(handle: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const qb = this.scopedQb('m', tenantId).andWhere('m.handle = :handle', { handle });
    if (excludeId) qb.andWhere('m.id != :excludeId', { excludeId });
    return (await qb.getCount()) > 0;
  }
}
