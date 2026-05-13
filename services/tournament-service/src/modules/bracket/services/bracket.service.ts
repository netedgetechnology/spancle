import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BracketRepository } from '../repositories/bracket.repository';
import { BracketEvents } from '../events/bracket.events';
import type { CreateBracketDto } from '../dto/create-bracket.dto';
import type { UpdateBracketDto } from '../dto/update-bracket.dto';
import type { BracketEntity } from '../entities/bracket.entity';

@Injectable()
export class BracketService {
  private readonly logger = new Logger(BracketService.name);

  constructor(
    private readonly bracketRepository: BracketRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateBracketDto, tenantId: string): Promise<BracketEntity> {
    this.logger.log(`Creating bracket -- tenant: ${tenantId}`);
    const entity = await this.bracketRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(BracketEvents.CREATED, { tenantId, bracketId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<BracketEntity[]> {
    return this.bracketRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<BracketEntity> {
    const entity = await this.bracketRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Bracket not found');
    return entity;
  }

  async update(id: string, dto: UpdateBracketDto, tenantId: string): Promise<BracketEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.bracketRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(BracketEvents.UPDATED, { tenantId, bracketId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.bracketRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(BracketEvents.DELETED, { tenantId, bracketId: id });
  }
}
