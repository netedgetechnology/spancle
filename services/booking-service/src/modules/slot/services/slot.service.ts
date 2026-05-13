import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { SlotRepository }   from '../repositories/slot.repository';
import { SlotUtils }        from '../utils/slot.utils';
import { SlotEvents }       from '../events/slot.events';
import type { SlotEntity, SlotStatus } from '../entities/slot.entity';
import type { CreateSlotDto } from '../dto/create-slot.dto';
import type { UpdateSlotDto } from '../dto/update-slot.dto';
import type { QuerySlotsDto } from '../dto/query-slots.dto';

/**
 * Allowed status transitions.
 * Terminal states (completed, cancelled) have no outbound transitions.
 */
const ALLOWED_TRANSITIONS: Record<SlotStatus, SlotStatus[]> = {
  available:   ['reserved', 'booked', 'unavailable', 'cancelled'],
  reserved:    ['available', 'booked', 'cancelled'],
  booked:      ['completed', 'cancelled'],
  unavailable: ['available', 'cancelled'],
  cancelled:   [],
  completed:   [],
};

/** Default reservation TTL: 15 minutes */
const RESERVATION_TTL_MINS = 15;

@Injectable()
export class SlotService {
  private readonly logger = new Logger(SlotService.name);

  constructor(
    private readonly slotRepository: SlotRepository,
    private readonly eventEmitter:   EventEmitter2,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateSlotDto, tenantId: string, actorId: string): Promise<SlotEntity> {
    const startAt = new Date(dto.startAt);
    const endAt   = new Date(dto.endAt);

    if (endAt <= startAt) {
      throw new BadRequestException('endAt must be after startAt');
    }

    const durationMins = SlotUtils.durationMins(startAt, endAt);
    if (durationMins < 15) {
      throw new BadRequestException('Slot duration must be at least 15 minutes');
    }

    // Overlap pre-check
    const overlaps = await this.slotRepository.countOverlapping({
      tenantId, courtId: dto.courtId, startAt, endAt,
    });
    if (overlaps > 0) {
      throw new BadRequestException(
        'This time window overlaps with an existing slot on this court',
      );
    }

    const slot = await this.slotRepository.create({
      tenantId,
      courtId:      dto.courtId,
      branchId:     dto.branchId,
      sportId:      dto.sportId      ?? null,
      startAt,
      endAt,
      durationMins,
      status:       dto.status       ?? 'available',
      priceOverrideMinor: dto.priceOverrideMinor ?? null,
      currency:     'GBP',
      label:        dto.label        ?? SlotUtils.buildLabel('Court', startAt, endAt),
      notes:        dto.notes        ?? null,
      maxBookings:  dto.maxBookings  ?? 1,
      currentBookings: 0,
    });

    await this.eventEmitter.emitAsync(SlotEvents.CREATED, {
      tenantId, slotId: slot.id, actorId, timestamp: new Date().toISOString(),
    });

    return slot;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: QuerySlotsDto): Promise<SlotEntity[]> {
    return this.slotRepository.query({
      tenantId,
      courtId:  query.courtId,
      branchId: query.branchId,
      sportId:  query.sportId,
      from:     query.from ? new Date(query.from) : undefined,
      to:       query.to   ? new Date(query.to)   : undefined,
      status:   query.status as SlotStatus | undefined,
    });
  }

  async findOne(id: string, tenantId: string): Promise<SlotEntity> {
    const slot = await this.slotRepository.findById(id, tenantId);
    if (!slot) throw new NotFoundException(`Slot ${id} not found`);
    return slot;
  }

  async getStatusSummary(tenantId: string): Promise<Record<SlotStatus, number>> {
    return this.slotRepository.countByStatus(tenantId);
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id:       string,
    dto:      UpdateSlotDto,
    tenantId: string,
    actorId:  string,
  ): Promise<SlotEntity> {
    const slot = await this.findOne(id, tenantId);

    if (dto.status && dto.status !== slot.status) {
      this.assertTransitionAllowed(slot.status, dto.status);
    }

    const updated = await this.slotRepository.updateById(id, tenantId, {
      ...(dto.status             !== undefined && { status: dto.status }),
      ...(dto.priceOverrideMinor !== undefined && { priceOverrideMinor: dto.priceOverrideMinor }),
      ...(dto.label              !== undefined && { label:  dto.label  }),
      ...(dto.notes              !== undefined && { notes:  dto.notes  }),
      ...(dto.maxBookings        !== undefined && { maxBookings: dto.maxBookings }),
    });

    await this.eventEmitter.emitAsync(SlotEvents.UPDATED, {
      tenantId, slotId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Status transitions ─────────────────────────────────────────────────────

  async updateStatus(
    id:       string,
    status:   SlotStatus,
    tenantId: string,
    actorId:  string,
  ): Promise<SlotEntity> {
    const slot = await this.findOne(id, tenantId);
    this.assertTransitionAllowed(slot.status, status);

    const reservedUntil = status === 'reserved'
      ? new Date(Date.now() + RESERVATION_TTL_MINS * 60_000)
      : null;

    const updated = await this.slotRepository.updateById(id, tenantId, {
      status,
      reservedUntil,
    });

    await this.eventEmitter.emitAsync(SlotEvents.STATUS_CHANGED, {
      tenantId, slotId: id, actorId,
      previousStatus: slot.status, newStatus: status,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Reserve ────────────────────────────────────────────────────────────────

  /**
   * Reserves a slot for a checkout session. TTL: 15 minutes.
   * Calling BookingService then calls this before creating a booking.
   */
  async reserve(id: string, tenantId: string, actorId: string): Promise<SlotEntity> {
    const slot = await this.findOne(id, tenantId);

    if (slot.status !== 'available') {
      throw new BadRequestException(
        `Slot is not available for reservation (current status: ${slot.status})`,
      );
    }

    return this.updateStatus(id, 'reserved', tenantId, actorId);
  }

  // ── Scheduler: expire stale reservations ───────────────────────────────────

  async expireStaleReservations(tenantId: string): Promise<number> {
    const count = await this.slotRepository.expireStaleReservations(tenantId);
    if (count > 0) {
      this.logger.log(`Expired ${count} stale reservations for tenant ${tenantId}`);
    }
    return count;
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async remove(id: string, tenantId: string, actorId: string): Promise<void> {
    const slot = await this.findOne(id, tenantId);

    if (slot.status === 'booked') {
      throw new BadRequestException(
        'A booked slot cannot be deleted. Cancel it first.',
      );
    }

    await this.slotRepository.softDelete(id, tenantId);

    await this.eventEmitter.emitAsync(SlotEvents.DELETED, {
      tenantId, slotId: id, actorId, timestamp: new Date().toISOString(),
    });
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private assertTransitionAllowed(from: SlotStatus, to: SlotStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition slot from "${from}" to "${to}". ` +
        `Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }
  }
}
