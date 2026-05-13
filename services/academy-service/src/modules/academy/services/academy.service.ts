import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AcademyRepository } from '../repositories/academy.repository';
import { AcademyEvents } from '../events/academy.events';
import type { CreateAcademyDto } from '../dto/create-academy.dto';
import type { UpdateAcademyDto } from '../dto/update-academy.dto';
import type { AcademyEntity } from '../entities/academy.entity';

@Injectable()
export class AcademyService {
  private readonly logger = new Logger(AcademyService.name);

  constructor(
    private readonly academyRepository: AcademyRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateAcademyDto, tenantId: string): Promise<AcademyEntity> {
    this.logger.log(`Creating academy -- tenant: ${tenantId}`);
    const entity = await this.academyRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(AcademyEvents.CREATED, { tenantId, academyId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<AcademyEntity[]> {
    return this.academyRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<AcademyEntity> {
    const entity = await this.academyRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Academy not found');
    return entity;
  }

  async update(id: string, dto: UpdateAcademyDto, tenantId: string): Promise<AcademyEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.academyRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(AcademyEvents.UPDATED, { tenantId, academyId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.academyRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(AcademyEvents.DELETED, { tenantId, academyId: id });
  }
}
