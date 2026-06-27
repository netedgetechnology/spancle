import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { HttpService }       from '@nestjs/axios';
import { ConfigService }     from '@nestjs/config';
import { DataSource }    from 'typeorm';

import { BookingRepository }          from '../repositories/booking.repository';
import { BookingLogRepository }       from '../repositories/booking-support.repository';
import { BookingValidationService }   from './booking-validation.service';
import { BookingUtils }               from '../utils/booking.utils';
import { BookingEvents }              from '../events/booking.events';
import type {
  BookingStatusChangedPayload,
  BookingRescheduledPayload,
  BookingRecurringGeneratedPayload,
} from '../events/booking.events';
import { BookingEntity, type BookingStatus } from '../entities/booking.entity';
import { SlotRepository }  from '../../slot/repositories/slot.repository';
import type { CreateBookingDto }    from '../dto/create-booking.dto';
import type { BookingQueryDto }     from '../dto/booking-query.dto';
import type {
  CancelBookingDto,
  RescheduleBookingDto,
  CheckInDto,
  MarkNoShowDto,
  WaiveNoShowDto,
  PaymentFailedDto,
} from '../dto/update-booking.dto';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed:       ['completed', 'cancelled', 'no_show'],
  completed:       [],
  cancelled:       ['refunded'],
  no_show:         ['no_show', 'refunded', 'completed'],
  refunded:        [],
};

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly bookingRepository:    BookingRepository,
    private readonly logRepository:        BookingLogRepository,
    private readonly validationService:    BookingValidationService,
    private readonly slotRepository:       SlotRepository,
    private readonly eventEmitter:         EventEmitter2,
    private readonly dataSource:           DataSource,
    private readonly httpService:          HttpService,
    private readonly configService:        ConfigService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto:      CreateBookingDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    const slots = await this.validationService.validateSlotsForBooking(
      dto.slotIds, tenantId, dto.courtId,
    );

    const sortedSlots = [...slots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const startsAt    = sortedSlots[0]!.startAt;
    const endsAt      = sortedSlots[sortedSlots.length - 1]!.endAt;
    const totalMins   = sortedSlots.reduce((s, sl) => s + sl.durationMins, 0);
    const totalPrice  = slots.every((s) => s.effectivePriceMinor !== null)
      ? slots.reduce((s, sl) => s + (sl.effectivePriceMinor ?? 0), 0)
      : null;
    const currency    = slots[0]!.currency;
    const reference   = BookingUtils.generateReference();

    const booking = await this.dataSource.transaction(async (manager) => {
      // ── Pessimistic lock: re-verify slots haven't been taken since outer validation ──
      await this.slotRepository.lockAndVerifyAvailable(dto.slotIds, tenantId, manager);

      const b = await manager.save(
        manager.create(BookingEntity, {
          tenantId,
          reference,
          branchId:         dto.branchId,
          courtId:          dto.courtId,
          sportId:          dto.sportId          ?? null,
          slotIds:          dto.slotIds,
          userId:           dto.customer.userId  ?? null,
          customerName:     dto.customer.name,
          customerEmail:    dto.customer.email,
          customerPhone:    dto.customer.phone   ?? null,
          isMember:         dto.customer.isMember ?? false,
          channel:          dto.channel           ?? 'online',
          status:           'pending_payment',
          startsAt,
          endsAt,
          totalDurationMins: totalMins,
          finalPriceMinor:  totalPrice,
          amountPaidMinor:  0,
          amountRefundedMinor: 0,
          currency,
          participantCount: dto.participantCount  ?? 1,
          customerNotes:    dto.customerNotes     ?? null,
          internalNotes:    dto.internalNotes     ?? null,
          metadata:         dto.metadata          ?? null,
          createdById:      actorId,
          updatedById:      actorId,
        }),
      );

      // Mark all slots as reserved, link booking ID
      for (const slot of slots) {
        await manager.update(
          (await import('../../slot/entities/slot.entity')).SlotEntity,
          { id: slot.id, tenantId },
          {
            status:       'reserved',
            bookingId:    b.id,
            reservedUntil: new Date(Date.now() + 30 * 60_000),
            updatedAt:    new Date(),
          },
        );
      }

      return b;
    });

    await this.logRepository.insert({
      tenantId,
      bookingId:  booking.id,
      action:     'created',
      actorId,
      actorType:  'user',
      newStatus:  'pending_payment',
    });

    await this.eventEmitter.emitAsync(BookingEvents.CREATED, {
      tenantId, bookingId: booking.id, actorId, timestamp: new Date().toISOString(),
    });

    this.logger.log(`Booking created: ${booking.reference} tenant=${tenantId}`);

    // Generate recurring series if requested
    if (dto.recurrence) {
      void this.generateRecurringSeries(booking, dto, tenantId, actorId);
    }

    return booking;
  }

  // ── Read ───────────────────────────────────────────────────────────────────

  async findAll(query: BookingQueryDto, tenantId: string): Promise<BookingEntity[]> {
    return this.bookingRepository.query({
      tenantId,
      branchId:  query.branchId,
      courtId:   query.courtId,
      sportId:   query.sportId,
      userId:    query.userId,
      reference: query.reference,
      status:    query.status as BookingStatus | undefined,
      from:      query.from ? new Date(query.from) : undefined,
      to:        query.to   ? new Date(query.to)   : undefined,
      limit:     query.limit  ?? 50,
      offset:    query.offset ?? 0,
    });
  }

  async findOne(id: string, tenantId: string): Promise<BookingEntity> {
    const b = await this.bookingRepository.findById(id, tenantId);
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async findByReference(reference: string, tenantId: string): Promise<BookingEntity> {
    const b = await this.bookingRepository.findByReference(reference, tenantId);
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async getStatusSummary(tenantId: string): Promise<Record<BookingStatus, number>> {
    return this.bookingRepository.countByStatus(tenantId);
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  async confirm(id: string, tenantId: string, actorId: string): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.assertTransitionAllowed(booking.status, 'confirmed');

    const updated = await this.dataSource.transaction(async (manager) => {
      const b = await this.bookingRepository.updateById(id, tenantId, {
        status:     'confirmed',
        updatedById: actorId,
      });

      for (const slotId of booking.slotIds) {
        await manager.update(
          (await import('../../slot/entities/slot.entity')).SlotEntity,
          { id: slotId, tenantId },
          { status: 'booked', reservedUntil: null, updatedAt: new Date() },
        );
      }

      return b;
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'confirmed',
      actorId, actorType: 'user',
      previousStatus: booking.status, newStatus: 'confirmed',
    });

    await this.emitStatusChange(tenantId, id, actorId, booking.status, 'confirmed');
    await this.eventEmitter.emitAsync(BookingEvents.CONFIRMED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    // Auto-create invoice in finance-service (fire-and-forget; failure is non-fatal)
    void this.createInvoiceForBooking(updated, tenantId, actorId);

    return updated;
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  async cancel(
    id:       string,
    dto:      CancelBookingDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.validationService.assertCancellable(booking);

    const updated = await this.dataSource.transaction(async (manager) => {
      const b = await this.bookingRepository.updateById(id, tenantId, {
        status:             'cancelled',
        cancelledAt:        new Date(),
        cancelledById:      dto.cancelledById ?? actorId,
        cancellationReason: dto.reason,
        updatedById:        actorId,
      });

      // Release all slots back to available
      for (const slotId of booking.slotIds) {
        await manager.update(
          (await import('../../slot/entities/slot.entity')).SlotEntity,
          { id: slotId, tenantId },
          {
            status:       'available',
            bookingId:    null,
            reservedUntil: null,
            updatedAt:    new Date(),
          },
        );
      }

      return b;
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'cancelled',
      actorId, actorType: 'user',
      previousStatus: booking.status, newStatus: 'cancelled',
      note: dto.reason,
    });

    await this.emitStatusChange(tenantId, id, actorId, booking.status, 'cancelled');
    await this.eventEmitter.emitAsync(BookingEvents.CANCELLED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    // Void invoice if one was already issued (fire-and-forget; non-fatal)
    void this.voidInvoiceForBooking(id, tenantId, actorId, dto.reason ?? 'booking cancelled');

    this.logger.log(`Booking cancelled: ${booking.reference} reason="${dto.reason}"`);
    return updated;
  }

  // ── Reschedule ─────────────────────────────────────────────────────────────

  async reschedule(
    id:       string,
    dto:      RescheduleBookingDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.validationService.assertReschedulable(booking);

    const newSlots = await this.validationService.validateSlotsForReschedule(
      dto.newSlotIds,
      booking.slotIds,
      tenantId,
      booking.courtId,
      id,
    );

    const sortedNew  = [...newSlots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const newStart   = sortedNew[0]!.startAt;
    const newEnd     = sortedNew[sortedNew.length - 1]!.endAt;
    const newMins    = newSlots.reduce((s, sl) => s + sl.durationMins, 0);
    const newPrice   = newSlots.every((s) => s.effectivePriceMinor !== null)
      ? newSlots.reduce((s, sl) => s + (sl.effectivePriceMinor ?? 0), 0)
      : null;

    const previousSlotIds = [...booking.slotIds];

    const updated = await this.dataSource.transaction(async (manager) => {
      const SlotEntity = (await import('../../slot/entities/slot.entity')).SlotEntity;

      // ── Pessimistic lock: re-verify new slots are still available ──
      await this.slotRepository.lockAndVerifyAvailable(dto.newSlotIds, tenantId, manager);

      // Release old slots
      for (const slotId of previousSlotIds) {
        await manager.update(SlotEntity, { id: slotId, tenantId }, {
          status: 'available', bookingId: null, reservedUntil: null, updatedAt: new Date(),
        });
      }

      // Reserve new slots
      for (const slot of newSlots) {
        await manager.update(SlotEntity, { id: slot.id, tenantId }, {
          status: 'booked', bookingId: id, reservedUntil: null, updatedAt: new Date(),
        });
      }

      // Update booking row inside the same transaction so slot moves and
      // booking update are atomic — a failure rolls back both together.
      await manager.update(
        BookingEntity,
        { id, tenantId },
        {
          slotIds:           dto.newSlotIds,
          startsAt:          newStart,
          endsAt:            newEnd,
          totalDurationMins: newMins,
          finalPriceMinor:   newPrice,
          updatedById:       actorId,
          updatedAt:         new Date(),
        },
      );
      return manager.findOneOrFail(BookingEntity, { where: { id, tenantId } });
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'rescheduled',
      actorId, actorType: 'user',
      diff: BookingUtils.sanitiseDiff({
        previousSlotIds,
        newSlotIds: dto.newSlotIds,
        reason:     dto.reason,
      }),
      note: dto.reason ?? null,
    });

    const payload: BookingRescheduledPayload = {
      tenantId, bookingId: id, actorId,
      previousSlotIds, newSlotIds: dto.newSlotIds,
      reason: dto.reason ?? null,
      timestamp: new Date().toISOString(),
    };
    await this.eventEmitter.emitAsync(BookingEvents.RESCHEDULED, payload);

    this.logger.log(`Booking rescheduled: ${booking.reference} tenant=${tenantId}`);
    return updated;
  }

  // ── Check-in ───────────────────────────────────────────────────────────────

  async checkIn(
    id:       string,
    dto:      CheckInDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.validationService.assertCheckInAllowed(booking);

    const updated = await this.bookingRepository.updateById(id, tenantId, {
      checkedInAt: new Date(),
      updatedById: actorId,
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'checked_in', actorId, actorType: 'user',
    });

    await this.eventEmitter.emitAsync(BookingEvents.CHECKED_IN, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── No-show ────────────────────────────────────────────────────────────────

  async markNoShow(
    id:       string,
    dto:      MarkNoShowDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.validationService.assertNoShowMarkable(booking);

    const updated = await this.dataSource.transaction(async (manager) => {
      const SlotEntity = (await import('../../slot/entities/slot.entity')).SlotEntity;

      for (const slotId of booking.slotIds) {
        await manager.update(SlotEntity, { id: slotId, tenantId }, {
          status: 'completed', updatedAt: new Date(),
        });
      }

      return this.bookingRepository.updateById(id, tenantId, {
        status:     'no_show',
        updatedById: actorId,
      });
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'no_show_marked',
      actorId, actorType: 'user',
      previousStatus: booking.status, newStatus: 'no_show',
      note: dto.notes ?? null,
    });

    await this.emitStatusChange(tenantId, id, actorId, booking.status, 'no_show');
    await this.eventEmitter.emitAsync(BookingEvents.NO_SHOW_MARKED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    this.logger.log(`No-show marked: ${booking.reference} tenant=${tenantId}`);
    return updated;
  }

  async waiveNoShow(
    id:       string,
    dto:      WaiveNoShowDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    if (booking.status !== 'no_show') {
      throw new BadRequestException('Only no-show bookings can be waived');
    }

    const updated = await this.bookingRepository.updateById(id, tenantId, {
      status:      'completed',
      completedAt: new Date(),
      updatedById: actorId,
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'no_show_waived',
      actorId, actorType: 'admin',
      previousStatus: 'no_show', newStatus: 'completed',
      note: dto.reason,
    });

    await this.eventEmitter.emitAsync(BookingEvents.NO_SHOW_WAIVED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Complete ───────────────────────────────────────────────────────────────

  async complete(id: string, tenantId: string, actorId: string): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.assertTransitionAllowed(booking.status, 'completed');

    const updated = await this.dataSource.transaction(async (manager) => {
      const SlotEntity = (await import('../../slot/entities/slot.entity')).SlotEntity;

      for (const slotId of booking.slotIds) {
        await manager.update(SlotEntity, { id: slotId, tenantId }, {
          status: 'completed', updatedAt: new Date(),
        });
      }

      return this.bookingRepository.updateById(id, tenantId, {
        status:      'completed',
        completedAt: new Date(),
        updatedById: actorId,
      });
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'completed',
      actorId, actorType: 'system',
      previousStatus: booking.status, newStatus: 'completed',
    });

    await this.emitStatusChange(tenantId, id, actorId, booking.status, 'completed');
    await this.eventEmitter.emitAsync(BookingEvents.COMPLETED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Recurring booking generation ───────────────────────────────────────────

  /**
   * Generates a series of recurring bookings from a parent booking.
   * Each occurrence is a new independent booking with the same customer
   * and court, but on shifted slot dates.
   *
   * Called asynchronously after the initial booking is created.
   * Slots for future dates must already exist (generated by SlotGeneratorService).
   * Occurrences where no matching slot is found are skipped silently.
   */

  // ── Payment failure ────────────────────────────────────────────────────────

  /**
   * Handles payment gateway timeout or decline for a pending_payment booking.
   * Transitions booking to cancelled and releases reserved slots.
   * Clients must call this endpoint when their payment gateway returns a failure
   * so that the slots are freed without waiting for the reservedUntil expiry.
   */
  async paymentFailed(
    id:       string,
    dto:      PaymentFailedDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.validationService.assertPaymentFailable(booking);

    const updated = await this.dataSource.transaction(async (manager) => {
      const SlotEntity = (await import('../../slot/entities/slot.entity')).SlotEntity;

      // Release all reserved slots immediately
      for (const slotId of booking.slotIds) {
        await manager.update(SlotEntity, { id: slotId, tenantId }, {
          status:        'available',
          bookingId:     null,
          reservedUntil: null,
          updatedAt:     new Date(),
        });
      }

      return this.bookingRepository.updateById(id, tenantId, {
        status:             'cancelled',
        cancelledAt:        new Date(),
        cancelledById:      actorId,
        cancellationReason: `Payment failed: ${dto.reason ?? dto.providerErrorMessage ?? 'gateway declined'}`,
        updatedById:        actorId,
      });
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'payment_failed',
      actorId, actorType: 'system',
      previousStatus: 'pending_payment', newStatus: 'cancelled',
      diff: {
        reason:              dto.reason,
        providerErrorCode:   dto.providerErrorCode,
        providerErrorMessage: dto.providerErrorMessage,
      },
    });

    await this.emitStatusChange(tenantId, id, actorId, 'pending_payment', 'cancelled');
    await this.eventEmitter.emitAsync(BookingEvents.CANCELLED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    this.logger.warn(
      `Payment failed for booking ${booking.reference}: ${dto.reason ?? dto.providerErrorCode}`,
    );
    return updated;
  }

  private async generateRecurringSeries(
    parent:   BookingEntity,
    dto:      CreateBookingDto,
    tenantId: string,
    actorId:  string,
  ): Promise<void> {
    if (!dto.recurrence) return;

    const { frequency, occurrences, until } = dto.recurrence;
    const offsets = BookingUtils.recurrenceOffsets(frequency, occurrences, until);
    const generatedIds: string[] = [];

    for (const offsetDays of offsets) {
      try {
        // Shift all original slot start/end times by offsetDays
        const originalSlots = await Promise.all(
          parent.slotIds.map((sid) => this.slotRepository.findById(sid, tenantId)),
        );

        const shiftedSlotIds: string[] = [];

        for (const originalSlot of originalSlots) {
          if (!originalSlot) continue;

          const newStart = new Date(
            originalSlot.startAt.getTime() + offsetDays * 86_400_000,
          );
          const newEnd = new Date(
            originalSlot.endAt.getTime() + offsetDays * 86_400_000,
          );

          // Find a matching available slot at the shifted time
          const candidates = await this.slotRepository.query({
            tenantId,
            courtId: originalSlot.courtId,
            from:    newStart,
            to:      new Date(newStart.getTime() + 60_000),
            status:  'available',
          });

          const match = candidates.find(
            (c) => c.startAt.getTime() === newStart.getTime()
                && c.endAt.getTime()   === newEnd.getTime(),
          );

          if (match) shiftedSlotIds.push(match.id);
        }

        if (shiftedSlotIds.length !== parent.slotIds.length) continue;

        const child = await this.create(
          {
            ...dto,
            slotIds: shiftedSlotIds,
            recurrence: undefined, // prevent infinite recursion
          },
          tenantId,
          actorId,
        );
        generatedIds.push(child.id);

      } catch (err: unknown) {
        const isConflict = err instanceof Error && (
          err.message.includes('no longer available') ||
          err.message.includes('overlaps') ||
          err.message.includes('ConflictException') ||
          err.constructor?.name === 'ConflictException' ||
          err.constructor?.name === 'UnprocessableEntityException'
        );
        if (isConflict) {
          this.logger.warn(
            `Recurring offset=${offsetDays}d SKIPPED (slot conflict): ${err instanceof Error ? err.message : String(err)}`,
          );
        } else {
          // Unexpected error — log at error level so it surfaces in monitoring
          this.logger.error(
            `Recurring offset=${offsetDays}d FAILED (unexpected): ${err instanceof Error ? err.message : String(err)}`,
            err instanceof Error ? err.stack : undefined,
          );
        }
      }
    }

    if (generatedIds.length > 0) {
      await this.logRepository.insert({
        tenantId,
        bookingId: parent.id,
        action:    'recurring_generated',
        actorId,
        actorType: 'system',
        diff:      { generatedIds, frequency, occurrences },
      });

      const payload: BookingRecurringGeneratedPayload = {
        tenantId,
        bookingId:       parent.id,
        actorId,
        parentBookingId: parent.id,
        generatedIds,
        frequency,
        timestamp:       new Date().toISOString(),
      };
      await this.eventEmitter.emitAsync(BookingEvents.RECURRING_GENERATED, payload);

      this.logger.log(
        `Recurring series: parent=${parent.id} generated=${generatedIds.length} tenant=${tenantId}`,
      );
    }
  }

  // ── Scheduler-facing ───────────────────────────────────────────────────────

  /**
   * Marks all confirmed bookings whose end time has passed as 'completed'.
   * Called by a scheduler task (Sprint 6).
   */
  async autoCompleteExpired(tenantId: string): Promise<number> {
    const expired = await this.bookingRepository.findPastConfirmed(
      tenantId,
      new Date(),
    );
    let count = 0;
    for (const b of expired) {
      try {
        await this.complete(b.id, tenantId, 'system');
        count++;
      } catch { /* individual failure does not block others */ }
    }
    return count;
  }

  /**
   * Auto-marks no-shows for confirmed bookings past the grace period
   * with no check-in.
   */
  async autoMarkNoShows(
    tenantId: string,
    gracePeriodMins = 30,
  ): Promise<number> {
    const candidates = await this.bookingRepository.findNoShowCandidates(
      tenantId,
      gracePeriodMins,
    );
    let count = 0;
    for (const b of candidates) {
      try {
        await this.markNoShow(
          b.id,
          { notes: 'Auto-marked by system after grace period' },
          tenantId,
          'system',
        );
        count++;
      } catch { /* individual failure does not block others */ }
    }
    return count;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertTransitionAllowed(from: BookingStatus, to: BookingStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot transition booking from "${from}" to "${to}". ` +
        `Allowed: [${allowed.join(', ') || 'none'}]`,
      );
    }
  }

  private async emitStatusChange(
    tenantId: string,
    bookingId: string,
    actorId:  string,
    from:     BookingStatus,
    to:       BookingStatus,
  ): Promise<void> {
    const payload: BookingStatusChangedPayload = {
      tenantId, bookingId, actorId,
      previousStatus: from, newStatus: to,
      timestamp: new Date().toISOString(),
    };
    await this.eventEmitter.emitAsync(BookingEvents.STATUS_CHANGED, payload);
  }

  // ── Private: void invoice on cancellation ──────────────────────────────────

  private async voidInvoiceForBooking(
    bookingId: string,
    tenantId:  string,
    actorId:   string,
    reason:    string,
  ): Promise<void> {
    const financeBase = this.configService.get<string>(
      'FINANCE_SERVICE_URL', 'http://localhost:3004',
    );

    try {
      // Find invoice by bookingId
      const searchRes = await this.httpService.axiosRef.get(
        `${financeBase}/api/v1/invoices`,
        {
          params:  { bookingId, limit: 1 },
          headers: { 'x-tenant-id': tenantId },
          timeout: 5_000,
        },
      );

      const invoices: Array<{ id: string; status: string }> = searchRes.data ?? [];
      const invoice = Array.isArray(invoices) ? invoices[0] : null;

      if (!invoice) {
        this.logger.debug(`No invoice found for booking ${bookingId} — nothing to void`);
        return;
      }

      // Only void if not already paid/voided
      if (['paid', 'voided', 'cancelled'].includes(invoice.status)) {
        this.logger.debug(`Invoice ${invoice.id} already in terminal status ${invoice.status} — skipping void`);
        return;
      }

      await this.httpService.axiosRef.patch(
        `${financeBase}/api/v1/invoices/${invoice.id}/void`,
        { reason: `Booking cancelled: ${reason}` },
        { headers: { 'x-tenant-id': tenantId, 'x-actor-id': actorId }, timeout: 5_000 },
      );

      this.logger.log(`Invoice ${invoice.id} voided for cancelled booking ${bookingId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Invoice void failed for booking ${bookingId}: ${msg} — manual correction required`,
      );
    }
  }

  // ── Private: auto-invoice on confirm ───────────────────────────────────────

  private async createInvoiceForBooking(
    booking:  BookingEntity,
    tenantId: string,
    actorId:  string,
  ): Promise<void> {
    const financeBase = this.configService.get<string>(
      'FINANCE_SERVICE_URL', 'http://localhost:3004',
    );
    const url = `${financeBase}/api/v1/invoices`;

    const body = {
      type:       'booking',
      bookingId:  booking.id,
      branchId:   booking.branchId,
      branchCode: 'HO',
      customerName:  booking.customerName,
      customerEmail: booking.customerEmail,
      lineItems: [{
        description:   `Court booking — ${booking.reference}`,
        quantity:      1,
        unitPriceMinor: booking.finalPriceMinor ?? 0,
        gstRateBps:    1800,   // 18 % default — adjust per branch GST config
      }],
    };

    try {
      await this.httpService.axiosRef.post(url, body, {
        headers: { 'x-tenant-id': tenantId, 'x-actor-id': actorId },
        timeout: 5_000,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Auto-invoice failed for booking ${booking.id}: ${msg} — manual creation required`,
      );
    }
  }


}
