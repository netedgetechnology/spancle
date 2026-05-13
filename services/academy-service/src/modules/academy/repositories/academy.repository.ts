import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AcademyEntity } from '../entities/academy.entity';

@Injectable()
export class AcademyRepository {
  private readonly logger = new Logger(AcademyRepository.name);

  constructor(
    @InjectRepository(AcademyEntity)
    private readonly repo: Repository<AcademyEntity>,
  ) {}

  async create(data: Partial<AcademyEntity>): Promise<AcademyEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<AcademyEntity[]> {
    return this.repo.find({ where: { tenantId, isDeleted: false } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<AcademyEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<AcademyEntity>): Promise<AcademyEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }
}
