import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantAwareRepository } from '../../../common/repositories/tenant-aware.repository';
import { MenuItemEntity } from '../entities/menu-item.entity';

@Injectable()
export class MenuItemRepository extends TenantAwareRepository<MenuItemEntity> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(MenuItemEntity, dataSource.manager);
  }

  async findByMenuId(menuId: string, tenantId: string): Promise<MenuItemEntity[]> {
    return this.scopedQb('mi', tenantId)
      .andWhere('mi.menuId = :menuId', { menuId })
      .andWhere('mi.isActive = :isActive', { isActive: true })
      .orderBy('mi.sortOrder', 'ASC')
      .getMany();
  }

  async deleteByMenuId(menuId: string, tenantId: string): Promise<void> {
    await this.entityManager
      .createQueryBuilder()
      .update(MenuItemEntity)
      .set({ isDeleted: true, deletedAt: new Date() })
      .where('menuId = :menuId AND tenantId = :tenantId AND isDeleted = false', { menuId, tenantId })
      .execute();
  }

  async wouldCreateCycle(itemId: string, newParentId: string, tenantId: string): Promise<boolean> {
    // Walk up the parent chain — if we reach itemId, it's a cycle
    let currentId: string | null = newParentId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === itemId) return true;
      if (visited.has(currentId)) return true;
      visited.add(currentId);

      const item = await this.scopedQb('mi', tenantId)
        .andWhere('mi.id = :id', { id: currentId })
        .select(['mi.parentId'])
        .getOne();

      currentId = item?.parentId ?? null;
    }

    return false;
  }
}
