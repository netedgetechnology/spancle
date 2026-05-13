import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CoachEntity } from '../entities/coach.entity';

@Injectable()
export class CoachRepository {
  private readonly logger = new Logger(CoachRepository.name);

  constructor(
    @InjectRepository(CoachEntity)
    private readonly repo: Repository<CoachEntity>,
  ) {}

  async create(data: Partial<CoachEntity>): Promise<CoachEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<CoachEntity[]> {
    return this.repo.find({ where: { tenantId, isDeleted: false } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<CoachEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<CoachEntity>): Promise<CoachEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }
}
