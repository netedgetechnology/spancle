import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CourtRepository } from '../repositories/court.repository';
import { VenueService }    from '../../venue/services/venue.service';
import { CourtEvents }     from '../events/court.events';
import type { CreateCourtDto } from '../dto/create-court.dto';
import type { UpdateCourtDto } from '../dto/update-court.dto';
import type { CourtEntity }    from '../entities/court.entity';

@Injectable()
export class CourtService {
  private readonly logger = new Logger(CourtService.name);

  constructor(
    private readonly courtRepository: CourtRepository,
    private readonly venueService:    VenueService,
    private readonly eventEmitter:    EventEmitter2,
  ) {}

  async create(dto: CreateCourtDto, tenantId: string): Promise<CourtEntity> {
    // Validate that the venue exists and belongs to this tenant
    await this.venueService.findOne(dto.venueId, tenantId);

    // Enforce unique name within venue
    if (await this.courtRepository.isNameTaken(dto.name, dto.venueId, tenantId)) {
      throw new ConflictException(
        `A court named "${dto.name}" already exists in this venue`,
      );
    }

    // Enforce unique courtNumber within venue when provided
    if (dto.courtNumber !== undefined) {
      if (await this.courtRepository.isCourtNumberTaken(dto.courtNumber, dto.venueId, tenantId)) {
        throw new ConflictException(
          `Court number ${dto.courtNumber} is already taken in this venue`,
        );
      }
    }

    this.logger.log(`Creating court — venue: ${dto.venueId} tenant: ${tenantId}`);

    const entity = await this.courtRepository.create({
      ...dto,
      tenantId,
      currency:       dto.currency      ?? 'GBP',
      indoorOutdoor:  dto.indoorOutdoor ?? 'indoor',
      slotDuration:   dto.slotDuration  ?? 60,
      bufferBefore:   dto.bufferBefore  ?? 0,
      bufferAfter:    dto.bufferAfter   ?? 0,
      displayOrder:   dto.displayOrder  ?? 0,
      isBookable:     dto.isBookable    ?? true,
      isActive:       dto.isActive      ?? true,
    });

    await this.eventEmitter.emitAsync(CourtEvents.CREATED, {
      tenantId,
      venueId: entity.venueId,
      courtId: entity.id,
    });

    return entity;
  }

  async findAll(tenantId: string): Promise<CourtEntity[]> {
    return this.courtRepository.findAllByTenant(tenantId);
  }

  async findAllByVenue(venueId: string, tenantId: string): Promise<CourtEntity[]> {
    // Validate venue exists for this tenant before listing its courts
    await this.venueService.findOne(venueId, tenantId);
    return this.courtRepository.findAllByVenue(venueId, tenantId);
  }

  async findOne(id: string, tenantId: string): Promise<CourtEntity> {
    const entity = await this.courtRepository.findByIdAndTenant(id, tenantId);
    if (!entity) throw new NotFoundException(`Court ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateCourtDto, tenantId: string): Promise<CourtEntity> {
    const existing = await this.findOne(id, tenantId);

    // Enforce unique name within venue when name changes
    if (dto.name !== undefined && dto.name !== existing.name) {
      if (await this.courtRepository.isNameTaken(dto.name, existing.venueId, tenantId, id)) {
        throw new ConflictException(
          `A court named "${dto.name}" already exists in this venue`,
        );
      }
    }

    // Enforce unique courtNumber within venue when number changes
    if (dto.courtNumber !== undefined && dto.courtNumber !== existing.courtNumber) {
      if (await this.courtRepository.isCourtNumberTaken(dto.courtNumber, existing.venueId, tenantId, id)) {
        throw new ConflictException(
          `Court number ${dto.courtNumber} is already taken in this venue`,
        );
      }
    }

    const updated = await this.courtRepository.update(id, tenantId, dto as Partial<CourtEntity>);

    // Emit bookability change event when isBookable is explicitly toggled
    if (dto.isBookable !== undefined && dto.isBookable !== existing.isBookable) {
      await this.eventEmitter.emitAsync(CourtEvents.BOOKABILITY_CHANGED, {
        tenantId,
        venueId:    existing.venueId,
        courtId:    id,
        isBookable: dto.isBookable,
      });
    }

    await this.eventEmitter.emitAsync(CourtEvents.UPDATED, {
      tenantId,
      venueId: existing.venueId,
      courtId: id,
    });

    return updated;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const existing = await this.findOne(id, tenantId);
    await this.courtRepository.softDelete(id, tenantId);

    await this.eventEmitter.emitAsync(CourtEvents.DELETED, {
      tenantId,
      venueId: existing.venueId,
      courtId: id,
    });

    this.logger.log(`Court ${id} soft-deleted — tenant: ${tenantId}`);
  }
}
