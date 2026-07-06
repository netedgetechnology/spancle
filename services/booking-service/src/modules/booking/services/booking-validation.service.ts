import {
  BadRequestException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SlotRepository }    from '../../slot/repositories/slot.repository';
import { BookingRepository } from '../repositories/booking.repository';
import { CourtService }      from '../../court/services/court.service';
import { VenueService }      from '../../venue/services/venue.service';
import type { BookingEntity } from '../entities/booking.entity';

export interface SlotInfo {
  id:          string;
  courtId:     string;
  branchId:    string;
  startAt:     Date;
  endAt:       Date;
  durationMins: number;
  status:      string;
  maxBookings: number;
  currentBookings: number;
  resolvedPriceMinor:  number | null;
  priceOverrideMinor:  number | null;
  effectivePriceMinor: number | null;  // priceOverrideMinor ?? resolvedPriceMinor
  currency:            string;
}

@Injectable()
export class BookingValidationService {
  private readonly logger = new Logger(BookingValidationService.name);

  constructor(
    private readonly slotRepository:    SlotRepository,
    private readonly bookingRepository: BookingRepository,
    private readonly courtService:      CourtService,
    private readonly venueService:      VenueService,
  ) {}

  /**
   * Validates that the court exists, is active, and is bookable.
   * Validates that the venue exists (soft-delete check).
   * Called by BookingService.create() before validateSlotsForBooking.
   */
  async validateCourtAndVenue(courtId: string, tenantId: string): Promise<void> {
    const court = await this.courtService.findOne(courtId, tenantId);
    // CourtService.findOne throws NotFoundException if not found.

    if (!court.isActive) {
      throw new UnprocessableEntityException(
        `Court ${courtId} is inactive and cannot accept new bookings`,
      );
    }
    if (!court.isBookable) {
      throw new UnprocessableEntityException(
        `Court ${courtId} is not accepting bookings`,
      );
    }

    // Validate venue exists (VenueService.findOne throws NotFoundException if soft-deleted)
    await this.venueService.findOne(court.venueId, tenantId);
  }

  /**
   * Validates all slots for a new booking:
   *   1. Each slot exists and belongs to tenant
   *   2. All slots are 'available' or 'reserved'
   *   3. All slots belong to the same court
   *   4. No slot overlap with existing confirmed bookings (DB-level guard)
   *   5. Booking capacity not exceeded
   *
   * Returns enriched slot data for use in booking creation.
   */
  async validateSlotsForBooking(
    slotIds:  string[],
    tenantId: string,
    courtId:  string,
  ): Promise<SlotInfo[]> {
    if (slotIds.length === 0) {
      throw new BadRequestException('At least one slotId is required');
    }
    if (slotIds.length > 20) {
      throw new BadRequestException('Cannot book more than 20 slots at once');
    }

    const slots: SlotInfo[] = [];

    for (const slotId of slotIds) {
      const slot = await this.slotRepository.findById(slotId, tenantId);

      if (!slot) {
        throw new UnprocessableEntityException(
          `Slot ${slotId} not found in this organisation`,
        );
      }
      if (slot.courtId !== courtId) {
        throw new UnprocessableEntityException(
          `Slot ${slotId} does not belong to court ${courtId}`,
        );
      }
      if (slot.status !== 'available' && slot.status !== 'reserved') {
        throw new UnprocessableEntityException(
          `Slot ${slotId} is not available for booking (status: ${slot.status})`,
        );
      }
      if (slot.currentBookings >= slot.maxBookings) {
        throw new UnprocessableEntityException(
          `Slot ${slotId} is fully booked (${slot.currentBookings}/${slot.maxBookings})`,
        );
      }

      slots.push({
        id:          slot.id,
        courtId:     slot.courtId,
        branchId:    slot.branchId,
        startAt:     slot.startAt,
        endAt:       slot.endAt,
        durationMins: slot.durationMins,
        status:      slot.status,
        maxBookings: slot.maxBookings,
        currentBookings: slot.currentBookings,
        resolvedPriceMinor:  slot.resolvedPriceMinor,
        priceOverrideMinor:  slot.priceOverrideMinor,
        effectivePriceMinor: slot.priceOverrideMinor ?? slot.resolvedPriceMinor,
        currency:            slot.currency,
      });
    }

    // Verify slots are contiguous and non-overlapping within the set
    this.assertNoInternalOverlap(slots);

    // DB overlap check against existing confirmed bookings
    await this.assertNoConfirmedOverlap(slots, tenantId);

    return slots;
  }

  /**
   * Validates slots for a reschedule operation.
   * Additional check: new slots must not be the same as current slots.
   */
  async validateSlotsForReschedule(
    newSlotIds:      string[],
    currentSlotIds:  string[],
    tenantId:        string,
    courtId:         string,
    existingBookingId: string,
  ): Promise<SlotInfo[]> {
    const overlap = newSlotIds.filter((id) => currentSlotIds.includes(id));
    if (overlap.length > 0) {
      throw new BadRequestException(
        'New slots must differ from current slots. ' +
        `${overlap.length} slot(s) are unchanged.`,
      );
    }

    const slots = await this.validateSlotsForBooking(newSlotIds, tenantId, courtId);

    // Exclude the current booking from the overlap check
    for (const slot of slots) {
      const conflicts = await this.bookingRepository.findConfirmedOverlapping({
        tenantId,
        courtId: slot.courtId,
        startsAt: slot.startAt,
        endsAt:   slot.endAt,
        excludeId: existingBookingId,
      });
      if (conflicts.length > 0) {
        throw new UnprocessableEntityException(
          `New slot ${slot.id} overlaps with booking ${conflicts[0]!.reference}`,
        );
      }
    }

    return slots;
  }

  /**
   * Validates that a booking can be cancelled.
   * Rules:
   *   - Only pending_payment and confirmed bookings can be cancelled
   *   - Already completed/refunded/cancelled: reject
   */
  assertCancellable(booking: BookingEntity): void {
    const cancellable: BookingEntity['status'][] = ['reserved', 'pending_payment', 'confirmed'];
    if (!cancellable.includes(booking.status)) {
      throw new BadRequestException(
        `Booking cannot be cancelled — current status: ${booking.status}`,
      );
    }
  }


  /**
   * Validates that a payment-failure can be recorded.
   * Only pending_payment bookings can be failed.
   */
  assertPaymentFailable(booking: BookingEntity): void {
    if (booking.status !== 'pending_payment') {
      throw new BadRequestException(
        `Payment failure can only be recorded on pending_payment bookings — status: ${booking.status}`,
      );
    }
  }

  /**
   * Validates that a booking can be rescheduled.
   * Only 'confirmed' bookings can be rescheduled.
   */
  assertReschedulable(booking: BookingEntity): void {
    const reschedulable: BookingEntity['status'][] = ['confirmed', 'checked_in'];
    if (!reschedulable.includes(booking.status)) {
      throw new BadRequestException(
        `Only confirmed or checked-in bookings can be rescheduled — current status: ${booking.status}`,
      );
    }
    if (booking.startsAt <= new Date()) {
      throw new BadRequestException(
        'Cannot reschedule a booking that has already started',
      );
    }
  }

  /**
   * Validates that a check-in is valid.
   * Booking must be confirmed and within the check-in window
   * (30 min before to 60 min after start time).
   */
  assertCheckInAllowed(booking: BookingEntity): void {
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(
        `Check-in only allowed for confirmed bookings — current status: ${booking.status}`,
      );
    }
    if (booking.checkedInAt) {
      throw new BadRequestException('Booking has already been checked in');
    }
    const now           = Date.now();
    const startsAt      = booking.startsAt.getTime();
    const windowOpen    = startsAt - 30 * 60_000;
    const windowClose   = startsAt + 60 * 60_000;

    if (now < windowOpen) {
      throw new BadRequestException(
        'Check-in is not yet open — available from 30 minutes before start time',
      );
    }
    if (now > windowClose) {
      throw new BadRequestException(
        'Check-in window has closed — booking will be marked as no-show',
      );
    }
  }

  /**
   * Validates that a no-show can be marked.
   * Booking must be confirmed and start time must have passed.
   */
  assertNoShowMarkable(booking: BookingEntity, gracePeriodMins = 30): void {
    if (booking.status !== 'confirmed') {
      throw new BadRequestException(
        `No-show can only be marked on confirmed bookings — status: ${booking.status}`,
      );
    }
    const cutoff = new Date(booking.startsAt.getTime() + gracePeriodMins * 60_000);
    if (new Date() < cutoff) {
      throw new BadRequestException(
        `No-show cannot be marked until ${gracePeriodMins} minutes after start time`,
      );
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertNoInternalOverlap(slots: SlotInfo[]): void {
    const sorted = [...slots].sort(
      (a, b) => a.startAt.getTime() - b.startAt.getTime(),
    );
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]!;
      const b = sorted[i + 1]!;
      if (a.endAt > b.startAt) {
        throw new UnprocessableEntityException(
          `Slots ${a.id} and ${b.id} overlap — cannot book overlapping slots`,
        );
      }
    }
  }

  private async assertNoConfirmedOverlap(
    slots:    SlotInfo[],
    tenantId: string,
  ): Promise<void> {
    for (const slot of slots) {
      const overlapping = await this.slotRepository.countOverlapping({
        tenantId,
        courtId: slot.courtId,
        startAt: slot.startAt,
        endAt:   slot.endAt,
        excludeId: slot.id,
      });
      if (overlapping > 0) {
        throw new UnprocessableEntityException(
          `Slot at ${slot.startAt.toISOString()} overlaps with an existing booking on court ${slot.courtId}`,
        );
      }
    }
  }
}
