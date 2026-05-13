import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VenueRepository } from '../repositories/venue.repository';
import { VenueEvents } from '../events/venue.events';
import type { CreateVenueDto } from '../dto/create-venue.dto';
import type { UpdateVenueDto } from '../dto/update-venue.dto';
import type { VenueEntity } from '../entities/venue.entity';

@Injectable()
export class VenueService {
  private readonly logger = new Logger(VenueService.name);

  constructor(
    private readonly venueRepository: VenueRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateVenueDto, tenantId: string): Promise<VenueEntity> {
    this.logger.log(`Creating venue -- tenant: ${tenantId}`);
    const entity = await this.venueRepository.create({ ...dto, tenantId });
    await this.eventEmitter.emitAsync(VenueEvents.CREATED, { tenantId, venueId: entity.id });
    return entity;
  }

  async findAll(tenantId: string): Promise<VenueEntity[]> {
    return this.venueRepository.findAllByTenant(tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<VenueEntity> {
    const entity = await this.venueRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException('Venue not found');
    return entity;
  }

  async update(id: string, dto: UpdateVenueDto, tenantId: string): Promise<VenueEntity> {
    await this.findOne(id, tenantId);
    const updated = await this.venueRepository.update(id, tenantId, dto);
    await this.eventEmitter.emitAsync(VenueEvents.UPDATED, { tenantId, venueId: id });
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    await this.findOne(id, tenantId);
    await this.venueRepository.softDelete(id, tenantId);
    await this.eventEmitter.emitAsync(VenueEvents.DELETED, { tenantId, venueId: id });
  }
}
