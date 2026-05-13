import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TemplateRepository } from '../repositories/template.repository';
import { TemplateEvents } from '../events/template.events';
import type { CreateTemplateDto } from '../dto/create-template.dto';
import type { UpdateTemplateDto } from '../dto/update-template.dto';
import type { TemplateEntity } from '../entities/template.entity';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly templateRepository: TemplateRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateTemplateDto, tenantId: string): Promise<TemplateEntity> {
    this.logger.log(`Creating template -- tenant: ${tenantId}`);
    const entity = await this.templateRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(TemplateEvents.CREATED, { tenantId, templateId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<TemplateEntity[]> {
    return this.templateRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<TemplateEntity> {
    const entity = await this.templateRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Template not found');
    return entity;
  }

  async update(id: string, dto: UpdateTemplateDto, tenantId: string): Promise<TemplateEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.templateRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(TemplateEvents.UPDATED, { tenantId, templateId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.templateRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(TemplateEvents.DELETED, { tenantId, templateId: id });
  }
}
