import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PlayerRepository } from '../repositories/player.repository';
import { PlayerEvents } from '../events/player.events';
import type { CreatePlayerDto } from '../dto/create-player.dto';
import type { UpdatePlayerDto } from '../dto/update-player.dto';
import type { PlayerEntity } from '../entities/player.entity';

@Injectable()
export class PlayerService {
  private readonly logger = new Logger(PlayerService.name);

  constructor(
    private readonly playerRepository: PlayerRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreatePlayerDto, tenantId: string): Promise<PlayerEntity> {
    this.logger.log(`Creating player -- tenant: ${tenantId}`);
    const entity = await this.playerRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(PlayerEvents.CREATED, { tenantId, playerId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<PlayerEntity[]> {
    return this.playerRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<PlayerEntity> {
    const entity = await this.playerRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Player not found');
    return entity;
  }

  async update(id: string, dto: UpdatePlayerDto, tenantId: string): Promise<PlayerEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.playerRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(PlayerEvents.UPDATED, { tenantId, playerId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.playerRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(PlayerEvents.DELETED, { tenantId, playerId: id });
  }
}
