import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantEntity } from '../entities/tenant.entity';

@Injectable()
export class TenantRepository {
  private readonly logger = new Logger(TenantRepository.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly repo: Repository<TenantEntity>,
  ) {}

  async create(data: Partial<TenantEntity>): Promise<TenantEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<TenantEntity[]> {
    return this.repo.find({ where: { tenantId, isDeleted: false } });
  }

  /**
   * findAll() — super-admin only.
   * Returns every non-deleted tenant row regardless of tenant_id.
   * Used by the superadmin portal list endpoint which must see all tenants,
   * not just those scoped to the platform super-tenant UUID.
   */
  async findAll(): Promise<TenantEntity[]> {
    return this.repo.find({ where: { isDeleted: false }, order: { createdAt: 'DESC' } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<TenantEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<TenantEntity>): Promise<TenantEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }
}
