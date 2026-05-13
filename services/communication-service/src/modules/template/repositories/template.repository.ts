import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TemplateEntity } from '../entities/template.entity';

@Injectable()
export class TemplateRepository {
  private readonly logger = new Logger(TemplateRepository.name);

  constructor(
    @InjectRepository(TemplateEntity)
    private readonly repo: Repository<TemplateEntity>,
  ) {}

  async create(data: Partial<TemplateEntity>): Promise<TemplateEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<TemplateEntity[]> {
    return this.repo.find({ where: { tenantId, isDeleted: false } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<TemplateEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<TemplateEntity>): Promise<TemplateEntity> {
    await this.repo.update({ id, tenantId }, data);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }
}
