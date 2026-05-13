import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TournamentRepository } from '../repositories/tournament.repository';
import { TournamentEvents } from '../events/tournament.events';
import type { CreateTournamentDto } from '../dto/create-tournament.dto';
import type { UpdateTournamentDto } from '../dto/update-tournament.dto';
import type { TournamentEntity } from '../entities/tournament.entity';

@Injectable()
export class TournamentService {
  private readonly logger = new Logger(TournamentService.name);

  constructor(
    private readonly tournamentRepository: TournamentRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateTournamentDto, tenantId: string): Promise<TournamentEntity> {
    this.logger.log(`Creating tournament -- tenant: ${tenantId}`);
    const entity = await this.tournamentRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(TournamentEvents.CREATED, { tenantId, tournamentId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<TournamentEntity[]> {
    return this.tournamentRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<TournamentEntity> {
    const entity = await this.tournamentRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Tournament not found');
    return entity;
  }

  async update(id: string, dto: UpdateTournamentDto, tenantId: string): Promise<TournamentEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.tournamentRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(TournamentEvents.UPDATED, { tenantId, tournamentId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.tournamentRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(TournamentEvents.DELETED, { tenantId, tournamentId: id });
  }
}
