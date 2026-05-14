import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlanEntity } from '../entities/plan.entity';

@Injectable()
export class PlanRepository {
  constructor(
    @InjectRepository(PlanEntity)
    private readonly repo: Repository<PlanEntity>,
  ) {}

  async create(data: Partial<PlanEntity>): Promise<PlanEntity> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async findByTenant(tenantId: string): Promise<PlanEntity | null> {
    return this.repo.findOne({ where: { tenantId, isActive: true, isDeleted: false } });
  }

  async findById(id: string): Promise<PlanEntity | null> {
    return this.repo.findOne({ where: { id, isDeleted: false } });
  }

  async update(id: string, data: Partial<PlanEntity>): Promise<PlanEntity> {
    await this.repo.update({ id }, { ...data, updatedAt: new Date() });
    return this.repo.findOneOrFail({ where: { id } });
  }

  async deactivateByTenant(tenantId: string): Promise<void> {
    await this.repo.update({ tenantId, isActive: true }, { isActive: false, updatedAt: new Date() });
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.update({ id }, { isDeleted: true, deletedAt: new Date() });
  }
}
