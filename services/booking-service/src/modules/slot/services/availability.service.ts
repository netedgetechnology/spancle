import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { SlotRepository }     from '../repositories/slot.repository';
import { BlackoutRepository } from '../repositories/blackout.repository';
import { CourtRepository }    from '../../court/repositories/court.repository';
import type { SlotEntity }    from '../entities/slot.entity';

export interface AvailabilityWindow {
  courtId:   string;
  branchId:  string;
  date:      string;      // YYYY-MM-DD
  slots:     SlotEntity[];
  hasBlackout: boolean;
}

export interface CourtAvailabilitySummary {
  courtId:          string;
  totalSlots:       number;
  availableSlots:   number;
  bookedSlots:      number;
  reservedSlots:    number;
  unavailableSlots: number;
  utilizationPct:   number;
}

/**
 * AvailabilityService — answers "what slots are available?" queries.
 *
 * Responsibilities:
 *   - Validate court exists and is active before returning availability
 *   - Query available/booked slots for a court or venue on a date range
 *   - Check whether a specific time window is free (used by BookingService)
 *   - Provide utilisation summaries for the admin calendar
 *   - Filter out blackout windows from availability results
 *
 * This service is read-only — it never mutates slots or blackouts.
 */
@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    private readonly slotRepository:    SlotRepository,
    private readonly blackoutRepository: BlackoutRepository,
    private readonly courtRepository:   CourtRepository,
  ) {}

  /**
   * Validates court exists, is active and bookable.
   * Called before any availability query that references a specific court.
   */
  private async validateCourt(courtId: string, tenantId: string): Promise<void> {
    const court = await this.courtRepository.findByIdAndTenant(courtId, tenantId);
    if (!court) {
      throw new NotFoundException(`Court ${courtId} not found`);
    }
    if (!court.isActive) {
      throw new BadRequestException(`Court ${courtId} is inactive`);
    }
    if (!court.isBookable) {
      throw new BadRequestException(`Court ${courtId} is not accepting bookings`);
    }
  }

  /**
   * Returns available slots for a court within a date range.
   * Validates the court is active and bookable before querying.
   */
  async getAvailableSlots(params: {
    tenantId:  string;
    courtId:   string;
    branchId:  string;
    sportId?:  string;
    from:      Date;
    to:        Date;
  }): Promise<SlotEntity[]> {
    await this.validateCourt(params.courtId, params.tenantId);
    return this.slotRepository.query({
      tenantId:  params.tenantId,
      courtId:   params.courtId,
      branchId:  params.branchId,
      sportId:   params.sportId,
      from:      params.from,
      to:        params.to,
      status:    'available',
    });
  }

  /**
   * Returns all slots (all statuses) for a court within a range.
   * Used by the admin calendar view.
   */
  async getAllSlots(params: {
    tenantId:  string;
    courtId?:  string;
    venueId?:  string;
    branchId?: string;
    sportId?:  string;
    from:      Date;
    to:        Date;
  }): Promise<SlotEntity[]> {
    return this.slotRepository.query({
      tenantId:  params.tenantId,
      courtId:   params.courtId,
      venueId:   params.venueId,
      branchId:  params.branchId,
      sportId:   params.sportId,
      from:      params.from,
      to:        params.to,
    });
  }

  /**
   * Returns all slots for every court in a venue within a date range.
   * Single query — caller groups by courtId for display.
   */
  async getVenueCalendar(params: {
    tenantId: string;
    venueId:  string;
    from:     Date;
    to:       Date;
  }): Promise<SlotEntity[]> {
    return this.slotRepository.findForVenueCalendar({
      tenantId: params.tenantId,
      venueId:  params.venueId,
      from:     params.from,
      to:       params.to,
    });
  }

  /**
   * Checks whether a specific time window is free on a court.
   *
   * Returns: { available: boolean, reason?: string }
   * Used by BookingService before confirming a booking.
   *
   * Checks:
   *   1. No overlapping non-cancelled slots
   *   2. No active blackout blocks new bookings in this window
   */
  async isWindowFree(params: {
    tenantId:  string;
    courtId:   string;
    branchId:  string;
    sportId?:  string;
    startAt:   Date;
    endAt:     Date;
    excludeSlotId?: string;
  }): Promise<{ available: boolean; reason?: string }> {
    const overlapCount = await this.slotRepository.countOverlapping({
      tenantId:  params.tenantId,
      courtId:   params.courtId,
      startAt:   params.startAt,
      endAt:     params.endAt,
      excludeId: params.excludeSlotId,
    });

    if (overlapCount > 0) {
      return { available: false, reason: 'overlap' };
    }

    const isBlocked = await this.blackoutRepository.isBlocked({
      tenantId:  params.tenantId,
      courtId:   params.courtId,
      branchId:  params.branchId,
      sportId:   params.sportId,
      startAt:   params.startAt,
      endAt:     params.endAt,
    });

    if (isBlocked) {
      return { available: false, reason: 'blackout' };
    }

    return { available: true };
  }

  /**
   * Court utilisation summary for an admin dashboard widget.
   * Returns slot counts and utilisation percentage.
   */
  async getCourtSummary(params: {
    tenantId:  string;
    courtId:   string;
    branchId:  string;
    from:      Date;
    to:        Date;
  }): Promise<CourtAvailabilitySummary> {
    await this.validateCourt(params.courtId, params.tenantId);

    const allSlots = await this.slotRepository.findForCourtCalendar({
      tenantId: params.tenantId,
      courtId:  params.courtId,
      from:     params.from,
      to:       params.to,
    });

    const counts = {
      available:   0,
      booked:      0,
      reserved:    0,
      unavailable: 0,
      cancelled:   0,
      completed:   0,
    };

    for (const slot of allSlots) {
      counts[slot.status] = (counts[slot.status] ?? 0) + 1;
    }

    const bookable    = counts.available + counts.booked + counts.reserved;
    const utilisation = bookable > 0
      ? Math.round(((counts.booked + counts.completed) / bookable) * 100)
      : 0;

    return {
      courtId:          params.courtId,
      totalSlots:       allSlots.length,
      availableSlots:   counts.available,
      bookedSlots:      counts.booked,
      reservedSlots:    counts.reserved,
      unavailableSlots: counts.unavailable,
      utilizationPct:   utilisation,
    };
  }
}

export interface AvailabilityWindow {
  courtId:   string;
  branchId:  string;
  date:      string;      // YYYY-MM-DD
  slots:     SlotEntity[];
  hasBlackout: boolean;
}

export interface CourtAvailabilitySummary {
  courtId:          string;
  totalSlots:       number;
  availableSlots:   number;
  bookedSlots:      number;
  reservedSlots:    number;
  unavailableSlots: number;
  utilizationPct:   number;
}

/**
 * AvailabilityService — answers "what slots are available?" queries.
 *
 * Responsibilities:
 *   - Query available/booked slots for a court or branch on a date range
 *   - Check whether a specific time window is free (used by BookingService)
 *   - Provide utilisation summaries for the admin calendar
 *   - Filter out blackout windows from availability results
 *
 * This service is read-only — it never mutates slots or blackouts.
 */
