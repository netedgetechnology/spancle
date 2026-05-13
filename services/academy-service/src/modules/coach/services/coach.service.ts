import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CoachRepository } from '../repositories/coach.repository';
import { CoachEvents } from '../events/coach.events';
import type { CreateCoachDto } from '../dto/create-coach.dto';
import type { UpdateCoachDto } from '../dto/update-coach.dto';
import type { CoachEntity } from '../entities/coach.entity';

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);

  constructor(
    private readonly coachRepository: CoachRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateCoachDto, tenantId: string): Promise<CoachEntity> {
    this.logger.log(`Creating coach -- tenant: ${tenantId}`);
    const entity = await this.coachRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(CoachEvents.CREATED, { tenantId, coachId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<CoachEntity[]> {
    return this.coachRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<CoachEntity> {
    const entity = await this.coachRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Coach not found');
    return entity;
  }

  async update(id: string, dto: UpdateCoachDto, tenantId: string): Promise<CoachEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.coachRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(CoachEvents.UPDATED, { tenantId, coachId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.coachRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(CoachEvents.DELETED, { tenantId, coachId: id });
  }
}
