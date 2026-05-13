import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MatchRepository } from '../repositories/match.repository';
import { MatchEvents } from '../events/match.events';
import type { CreateMatchDto } from '../dto/create-match.dto';
import type { UpdateMatchDto } from '../dto/update-match.dto';
import type { MatchEntity } from '../entities/match.entity';

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(
    private readonly matchRepository: MatchRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateMatchDto, tenantId: string): Promise<MatchEntity> {
    this.logger.log(`Creating match -- tenant: ${tenantId}`);
    const entity = await this.matchRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(MatchEvents.CREATED, { tenantId, matchId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<MatchEntity[]> {
    return this.matchRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<MatchEntity> {
    const entity = await this.matchRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Match not found');
    return entity;
  }

  async update(id: string, dto: UpdateMatchDto, tenantId: string): Promise<MatchEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.matchRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(MatchEvents.UPDATED, { tenantId, matchId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.matchRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(MatchEvents.DELETED, { tenantId, matchId: id });
  }
}
