import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { MatchEntity } from '../entities/match.entity';

@Injectable()
export class MatchRepository {
  private readonly logger = new Logger(MatchRepository.name);

  constructor(
    @InjectRepository(MatchEntity)
    private readonly repo: Repository<MatchEntity>,
  ) {}

  async create(data: Partial<MatchEntity>): Promise<MatchEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<MatchEntity[]> {
    return this.repo.find({ where: { tenantId, isDeleted: false } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<MatchEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<MatchEntity>): Promise<MatchEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }
}
