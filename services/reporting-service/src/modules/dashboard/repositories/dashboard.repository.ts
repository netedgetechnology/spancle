import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { DashboardEntity } from '../entities/dashboard.entity';

@Injectable()
export class DashboardRepository {
  private readonly logger = new Logger(DashboardRepository.name);

  constructor(
    @InjectRepository(DashboardEntity)
    private readonly repo: Repository<DashboardEntity>,
  ) {}

  async create(data: Partial<DashboardEntity>): Promise<DashboardEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<DashboardEntity[]> {
    return this.repo.find({ where: { tenantId, isDeleted: false } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<DashboardEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<DashboardEntity>): Promise<DashboardEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }
}
