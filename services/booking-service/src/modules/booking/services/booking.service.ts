import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventEmitter2 }    from '@nestjs/event-emitter';
import { ConfigService }     from '@nestjs/config';
import { DataSource }    from 'typeorm';

import { BookingRepository }          from '../repositories/booking.repository';
import { BookingLogRepository }       from '../repositories/booking-support.repository';
import { BookingPaymentRepository }    from '../repositories/booking-support.repository';
import { BookingRefundRepository }     from '../repositories/booking-support.repository';
import { BookingValidationService }   from './booking-validation.service';
import { BookingUtils }               from '../utils/booking.utils';
import { BookingEvents }              from '../events/booking.events';
import { SlotEvents }                from '../../slot/events/slot.events';
import { PricingRuleRepository }     from '../../slot/repositories/pricing-rule.repository';
import type {
  BookingStatusChangedPayload,
  BookingRescheduledPayload,
  BookingRecurringGeneratedPayload,
} from '../events/booking.events';
import { BookingEntity, type BookingStatus } from '../entities/booking.entity';
import { SlotRepository }  from '../../slot/repositories/slot.repository';
import { BookingRulesService } from '../../booking-rules/services/booking-rules.service';
import { CustomerService }    from '../../customer/services/customer.service';
import { MembershipIntegrationService } from './membership-integration.service';
import { RedisEventBusPublisher } from '../../../common/event-bus/redis-event-bus.publisher';
import type { CreateBookingDto }    from '../dto/create-booking.dto';
import type { BookingQueryDto }     from '../dto/booking-query.dto';
import type {
  CancelBookingDto,
  RescheduleBookingDto,
  CheckInDto,
  MarkNoShowDto,
  WaiveNoShowDto,
  PaymentFailedDto,
  ProcessBookingRefundDto,
} from '../dto/update-booking.dto';
import { BookingRefundEntity } from '../entities/booking-refund.entity';
import { BookingPaymentEntity } from '../entities/booking-payment.entity';
import { BookingRefundPaymentAllocationEntity } from '../entities/booking-refund-payment-allocation.entity';

/** Reservation TTL in minutes — configurable via BOOKING_RESERVATION_TTL_MINS */
const DEFAULT_RESERVATION_TTL_MINS = 15;

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  reserved:        ['pending_payment', 'cancelled', 'expired'],
  pending_payment: ['confirmed', 'cancelled', 'expired'],
  confirmed:       ['checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
  checked_in:      ['in_progress', 'completed'],
  in_progress:     ['completed'],
  completed:       [],
  cancelled:       ['refunded'],
  no_show:         ['refunded'],
  rescheduled:     [],
  refunded:        [],
  expired:         [],
};

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly bookingRepository:    BookingRepository,
    private readonly logRepository:        BookingLogRepository,
    private readonly paymentRepository:    BookingPaymentRepository,
    private readonly refundRepository:     BookingRefundRepository,
    private readonly validationService:    BookingValidationService,
    private readonly slotRepository:       SlotRepository,
    private readonly pricingRuleRepository: PricingRuleRepository,
    private readonly eventEmitter:         EventEmitter2,
    private readonly dataSource:           DataSource,
    private readonly configService:        ConfigService,
    private readonly bookingRulesService:  BookingRulesService,
    private readonly customerService:      CustomerService,
    private readonly membershipIntegration: MembershipIntegrationService,
    private readonly redisPublisher:       RedisEventBusPublisher,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto:      CreateBookingDto,
    tenantId: string,
    actorId:  string,
  ): Promise<BookingEntity> {
    // Validate court is active + bookable, venue exists — before any slot locking
    await this.validationService.validateCourtAndVenue(dto.courtId, tenantId);

    const slots = await this.validationService.validateSlotsForBooking(
      dto.slotIds, tenantId, dto.courtId,
    );

    const sortedSlots = [...slots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const startsAt    = sortedSlots[0]!.startAt;
    const endsAt      = sortedSlots[sortedSlots.length - 1]!.endAt;
    const totalMins   = sortedSlots.reduce((s, sl) => s + sl.durationMins, 0);

    // Enforce booking rules (advance window, notice, duration, limits, members-only)
    await this.bookingRulesService.enforceCreateRules({
      dto,
      tenantId,
      startsAt,
      endsAt,
      totalMins,
      actorId,
    });
    const rawTotalPrice = slots.every((s) => s.effectivePriceMinor !== null)
      ? slots.reduce((s, sl) => s + (sl.effectivePriceMinor ?? 0), 0)
      : null;
    const currency    = slots[0]!.currency;

    // ── Membership validation and pricing ──────────────────────────────────
    const membershipResult = await this.membershipIntegration.validateAndComputePrice({
      dto,
      tenantId,
      slotPriceMinor: rawTotalPrice,
      courtId:        dto.courtId,
      branchId:       dto.branchId,
      sportId:        dto.sportId ?? null,
    });
    const totalPrice   = membershipResult.adjustedPriceMinor ?? rawTotalPrice;
    const discountMinor = membershipResult.discountMinor;
    const reference   = BookingUtils.generateReference();

    const booking = await this.dataSource.transaction(async (manager) => {
      // ── Pessimistic lock: re-verify slots haven't been taken since outer validation ──
      await this.slotRepository.lockAndVerifyAvailable(dto.slotIds, tenantId, manager);

      // ── Coupon redemption: validate and increment atomically inside transaction ──
      if (dto.couponCode) {
        const slotDate   = sortedSlots[0]!.startAt.toISOString().slice(0, 10);
        const couponRule = await this.pricingRuleRepository.findCouponRule(
          dto.couponCode, tenantId, slotDate,
        );
        if (!couponRule) {
          throw new BadRequestException(`Coupon code "${dto.couponCode}" is invalid or expired`);
        }
        if (couponRule.maxRedemptions !== null && couponRule.redemptionCount >= couponRule.maxRedemptions) {
          throw new BadRequestException(`Coupon code "${dto.couponCode}" has been fully redeemed`);
        }
        await this.pricingRuleRepository.incrementRedemption(couponRule.id, tenantId, manager);
      }

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
          membershipId:     membershipResult.context?.membershipId    ?? null,
          entitlementType:  membershipResult.shouldConsumeCredit ? 'court_credit' : null,
          discountMinor,
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

    // Resolve or auto-create customer record (non-fatal — never blocks booking)
    void this.customerService.resolveOrCreateForBooking({
      tenantId,
      userId:   dto.customer.userId  ?? null,
      email:    dto.customer.email,
      name:     dto.customer.name,
      phone:    dto.customer.phone   ?? null,
      isMember: dto.customer.isMember ?? false,
      isGuest:  !dto.customer.userId,
    }).then((customerId) => {
      if (customerId) {
        void this.dataSource.query(
          'UPDATE bookings SET customer_id = $1 WHERE id = $2 AND tenant_id = $3',
          [customerId, booking.id, tenantId],
        );
      }
    }).catch((err: unknown) => {
      this.logger.warn(`Customer resolution failed for booking ${booking.id}: ${
        err instanceof Error ? err.message : String(err)
      }`);
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

  // ── Reserve ─────────────────────────────────────────────────────────────────

  /**
   * Transitions a pending_payment booking into 'reserved' state with an expiry.
   * Used when a slot hold is needed before payment is initiated.
   * Slots remain 'reserved' (not released) until expiry or payment confirmation.
   */
  async reserve(id: string, tenantId: string, actorId: string): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.assertTransitionAllowed(booking.status, 'reserved');

    const ttlMins = this.configService.get<number>(
      'BOOKING_RESERVATION_TTL_MINS',
      DEFAULT_RESERVATION_TTL_MINS,
    );
    const expiresAt = new Date(Date.now() + ttlMins * 60_000);

    const updated = await this.bookingRepository.updateById(id, tenantId, {
      status: 'reserved',
      expiresAt,
      updatedById: actorId,
    });

    await this.logRepository.insert({
      tenantId, bookingId: id,
      action: 'status_changed', actorId, actorType: 'user',
      previousStatus: booking.status, newStatus: 'reserved',
      note: `Reservation held until ${expiresAt.toISOString()}`,
    });
    await this.eventEmitter.emitAsync(BookingEvents.RESERVED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Expire ──────────────────────────────────────────────────────────────────

  /**
   * Transitions a reserved/pending_payment booking to 'expired' and releases slots.
   * Called by the scheduler when expiresAt < now().
   * Can also be called explicitly by staff to manually expire a stale hold.
   */
  async expire(id: string, tenantId: string, actorId: string): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.assertTransitionAllowed(booking.status, 'expired');

    const updated = await this.dataSource.transaction(async (manager) => {
      const SlotEntity = (await import('../../slot/entities/slot.entity')).SlotEntity;
      // Release held slots
      for (const slotId of booking.slotIds) {
        await manager.update(
          SlotEntity,
          { id: slotId, tenantId },
          { status: 'available', bookingId: null, updatedAt: new Date() },
        );
      }
      await manager.update(
        BookingEntity,
        { id, tenantId },
        { status: 'expired', expiresAt: null, updatedById: actorId, updatedAt: new Date() },
      );
      return manager.findOneOrFail(BookingEntity, { where: { id, tenantId } });
    });

    await this.logRepository.insert({
      tenantId, bookingId: id,
      action: 'status_changed', actorId, actorType: 'system',
      previousStatus: booking.status, newStatus: 'expired',
    });
    await this.eventEmitter.emitAsync(BookingEvents.EXPIRED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });
    await this.eventEmitter.emitAsync(SlotEvents.SLOTS_RELEASED, {
      tenantId, bookingId: id, slotIds: booking.slotIds,
      reason: 'expired', actorId, timestamp: new Date().toISOString(),
    });

    // CB-2 FIX: bridge BOOKING_EXPIRED to Redis so communication-service receives it
    void this.redisPublisher.publishBookingExpired({
      tenantId,
      bookingId:     id,
      customerEmail: booking.customerEmail ?? undefined,
      customerName:  booking.customerName  ?? undefined,
      reference:     booking.reference     ?? undefined,
      startsAt:      booking.startsAt instanceof Date
        ? booking.startsAt.toISOString()
        : String(booking.startsAt),
    });

    return updated;
  }

  // ── Confirm ────────────────────────────────────────────────────────────────

  async confirm(id: string, tenantId: string, actorId: string): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.assertTransitionAllowed(booking.status, 'confirmed');

    // CB-1 FIX: both the booking status update AND the slot status updates must
    // execute on the same EntityManager so they are covered by a single transaction.
    // Previously bookingRepository.updateById() used its own injected repo connection
    // (outside the transaction manager), creating a split-brain risk where slot rows
    // could commit while the booking row roll-back (or vice versa).
    const updated = await this.dataSource.transaction(async (manager) => {
      const SlotEntity = (await import('../../slot/entities/slot.entity')).SlotEntity;

      // Update booking status via manager — same transaction as slot updates below
      await manager.update(
        BookingEntity,
        { id, tenantId },
        { status: 'confirmed', updatedById: actorId, updatedAt: new Date() },
      );

      for (const slotId of booking.slotIds) {
        await manager.update(
          SlotEntity,
          { id: slotId, tenantId },
          { status: 'booked', reservedUntil: null, updatedAt: new Date() },
        );
      }

      return manager.findOneOrFail(BookingEntity, { where: { id, tenantId } });
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'confirmed',
      actorId, actorType: 'user',
      previousStatus: booking.status, newStatus: 'confirmed',
    });

    // Consume membership entitlement if a credit was reserved
    const txnId = await this.membershipIntegration.consumeEntitlement({ booking, tenantId, actorId });
    if (txnId) {
      await this.dataSource.query(
        'UPDATE bookings SET entitlement_txn_id = $1 WHERE id = $2 AND tenant_id = $3',
        [txnId, id, tenantId],
      );
    }

    await this.emitStatusChange(tenantId, id, actorId, booking.status, 'confirmed');
    await this.eventEmitter.emitAsync(BookingEvents.CONFIRMED, {
      tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
    });

    return updated;
  }

  // ── Cancel ─────────────────────────────────────────────────────────────────

  async cancel(
    id:        string,
    dto:       CancelBookingDto,
    tenantId:  string,
    actorId:   string,
    actorRole  = 'PLAYER',
  ): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    await this.bookingRulesService.enforceCancellationRules({
      booking, dto, tenantId, actorRole,
    });
    this.validationService.assertCancellable(booking);

    const updated = await this.dataSource.transaction(async (manager) => {
      const SlotEntity = (await import('../../slot/entities/slot.entity')).SlotEntity;

      // H-1 FIX: all three writes — booking status, slot release, and
      // entitlement/wallet restore — execute on the SAME EntityManager so they
      // commit or roll back atomically.
      //
      // Previously: bookingRepository.updateById() used its own repo connection
      // (outside the transaction) and restoreEntitlement() opened a SECOND
      // transaction. A failure between these two left a cancelled booking with
      // no slot release, or a released booking with no credit restored.

      // 1. Update booking status via manager (same transaction)
      await manager.update(
        BookingEntity,
        { id, tenantId },
        {
          status:             'cancelled',
          cancelledAt:        new Date(),
          cancelledById:      dto.cancelledById ?? actorId,
          cancellationReason: dto.reason,
          updatedById:        actorId,
          updatedAt:          new Date(),
        },
      );

      // 2. Release all slots back to available (same transaction)
      for (const slotId of booking.slotIds) {
        await manager.update(
          SlotEntity,
          { id: slotId, tenantId },
          {
            status:        'available',
            bookingId:     null,
            reservedUntil: null,
            updatedAt:     new Date(),
          },
        );
      }

      // 3. Restore membership entitlement + wallet (same transaction)
      // throws if the refund fails so the whole transaction rolls back —
      // preventing a booking from being cancelled without the credit restored.
      await this.membershipIntegration.restoreEntitlementWithManager(
        manager, booking, tenantId, actorId,
      );

      return manager.findOneOrFail(BookingEntity, { where: { id, tenantId } });
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
    await this.eventEmitter.emitAsync(SlotEvents.SLOTS_RELEASED, {
      tenantId, bookingId: id, slotIds: booking.slotIds,
      reason: 'cancelled', actorId, timestamp: new Date().toISOString(),
    });

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
    const bookingForRules = await this.bookingRepository.findByIdOrFail(id, tenantId);
    await this.bookingRulesService.enforceRescheduleRules({
      booking: bookingForRules, dto, tenantId, actorId,
    });
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

    // CB-2 FIX: bridge BOOKING_RESCHEDULED to Redis for communication-service email
    void this.redisPublisher.publishBookingRescheduled({
      tenantId,
      bookingId:     id,
      actorId,
      customerEmail: booking.customerEmail ?? undefined,
      customerName:  booking.customerName  ?? undefined,
      reference:     booking.reference     ?? undefined,
      newStartsAt:   updated.startsAt instanceof Date
        ? updated.startsAt.toISOString()
        : String(updated.startsAt),
      durationMins:  updated.totalDurationMins,
      reason:        dto.reason ?? null,
    });

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

  // ── Mark In-Progress ──────────────────────────────────────────────────────

  async markInProgress(id: string, tenantId: string, actorId: string): Promise<BookingEntity> {
    const booking = await this.findOne(id, tenantId);
    this.assertTransitionAllowed(booking.status, 'in_progress');

    const updated = await this.bookingRepository.updateById(id, tenantId, {
      status: 'in_progress',
      updatedById: actorId,
    });

    await this.logRepository.insert({
      tenantId, bookingId: id, action: 'status_changed',
      actorId, actorType: 'system',
      previousStatus: booking.status, newStatus: 'in_progress',
    });
    await this.emitStatusChange(tenantId, id, actorId, booking.status, 'in_progress');
    await this.eventEmitter.emitAsync(BookingEvents.IN_PROGRESS, {
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
    await this.eventEmitter.emitAsync(SlotEvents.SLOTS_RELEASED, {
      tenantId, bookingId: id, slotIds: booking.slotIds,
      reason: 'cancelled', actorId, timestamp: new Date().toISOString(),
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
   * Expires all bookings in reserved/pending_payment whose expiresAt has passed.
   * Processes in batches. Returns count of expired bookings.
   * Slot release is handled inside expire() — no duplication here.
   */
  async autoExpireReservations(): Promise<number> {
    const batchSize = this.configService.get<number>('BOOKING_SCHEDULER_BATCH_SIZE', 50);
    const candidates = await this.bookingRepository.findExpiredReservations(batchSize);
    let count = 0;
    for (const b of candidates) {
      try {
        await this.expire(b.id, b.tenantId, 'system');
        count++;
      } catch (err) {
        this.logger.warn(`autoExpireReservations: failed for ${b.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoExpireReservations: expired ${count} bookings`);
    return count;
  }

  /**
   * Transitions confirmed bookings to in_progress when start time arrives.
   * Runs per-tenant; called by scheduler.
   */
  async autoMarkInProgress(tenantId: string): Promise<number> {
    const batchSize = this.configService.get<number>('BOOKING_SCHEDULER_BATCH_SIZE', 50);
    const candidates = await this.bookingRepository.findStartedConfirmed(tenantId, batchSize);
    let count = 0;
    for (const b of candidates) {
      try {
        await this.markInProgress(b.id, b.tenantId, 'system');
        count++;
      } catch (err) {
        this.logger.warn(`autoMarkInProgress: failed for ${b.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoMarkInProgress: ${count} bookings in_progress — tenant ${tenantId}`);
    return count;
  }

  /**
   * Marks all confirmed bookings whose end time has passed as 'completed'.
   * Called by the scheduler.
   */
  async autoCompleteExpired(tenantId: string): Promise<number> {
    const batchSize = this.configService.get<number>('BOOKING_SCHEDULER_BATCH_SIZE', 50);
    const delayMins = this.configService.get<number>('BOOKING_AUTOCOMPLETE_DELAY_MINS', 0);
    const before = new Date(Date.now() - delayMins * 60_000);
    const expired = await this.bookingRepository.findPastConfirmed(tenantId, before, batchSize);
    let count = 0;
    for (const b of expired) {
      try {
        await this.complete(b.id, tenantId, 'system');
        count++;
      } catch (err) {
        this.logger.warn(`autoCompleteExpired: failed for ${b.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoCompleteExpired: completed ${count} bookings — tenant ${tenantId}`);
    return count;
  }

  /**
   * Auto-marks no-shows for confirmed bookings past the grace period with no check-in.
   */
  async autoMarkNoShows(tenantId: string): Promise<number> {
    const batchSize   = this.configService.get<number>('BOOKING_SCHEDULER_BATCH_SIZE', 50);
    const graceMins   = this.configService.get<number>('BOOKING_NO_SHOW_GRACE_MINS', 30);
    const candidates  = await this.bookingRepository.findNoShowCandidates(tenantId, graceMins, batchSize);
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
      } catch (err) {
        this.logger.warn(`autoMarkNoShows: failed for ${b.id} — ${(err as Error).message}`);
      }
    }
    if (count) this.logger.log(`autoMarkNoShows: marked ${count} no-shows — tenant ${tenantId}`);
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

  // ── Process Refund ────────────────────────────────────────────────────────

  /**
   * Records a booking-level refund across ALL eligible paid payments and
   * emits BookingEvents.REFUNDED.
   *
   * Defects corrected (Batch 7.5D):
   *   1. Capacity is now aggregated across ALL paid payments, not just the
   *      most-recent one.
   *   2. Full-refund condition: totalRefundedAfter >= totalPaidMinor
   *      (not compared against remainingCapacity).
   *   3. Refund is allocated across multiple payments deterministically
   *      (ascending by id) via booking_refund_payment_allocations.
   *   4. Concurrent same-key requests: raw 23505 is caught and resolved
   *      to a clean idempotent return.
   *
   * Lock order (deterministic, no deadlock):
   *   1. BookingEntity FOR UPDATE
   *   2. ALL eligible BookingPaymentEntity rows FOR UPDATE (ascending by id)
   *
   * Capacity formula:
   *   totalPaidMinor        = SUM(paidPayment.amountMinor)
   *   committedRefundMinor  = SUM(booking_refunds.amountMinor)
   *                           WHERE status IN ('pending','processed')
   *   remainingCapacity     = totalPaidMinor - committedRefundMinor
   *   Guard: dto.amountMinor <= remainingCapacity
   *
   * Full-refund condition:
   *   totalRefundedAfter = committedRefundMinor + dto.amountMinor
   *   isFullRefund       = totalRefundedAfter >= totalPaidMinor
   *
   * BookingEvents.REFUNDED emitted ONLY after transaction commits.
   * Idempotent retry: returns existing row, no DB mutation, no event.
   */
  async processRefund(
    bookingId: string,
    dto:       ProcessBookingRefundDto,
    tenantId:  string,
    actorId:   string,
  ): Promise<BookingRefundEntity> {
    if (!Number.isInteger(dto.amountMinor) || dto.amountMinor <= 0) {
      throw new BadRequestException('amountMinor must be a positive integer (minor units)');
    }

    // ── Pre-transaction idempotency check ─────────────────────────────────
    // If the key is already committed, return the existing row immediately.
    // This is the normal idempotent-retry path (no DB mutation, no event).
    const existingPre = await this.dataSource
      .getRepository(BookingRefundEntity)
      .findOne({ where: { tenantId, idempotencyKey: dto.idempotencyKey, isDeleted: false } });
    if (existingPre) {
      this.logger.warn(
        `processRefund: idempotency hit (pre-tx) key=${dto.idempotencyKey} → ${existingPre.id}`,
      );
      return existingPre;
    }

    let refundResult: {
      refund:           BookingRefundEntity;
      previousStatus:   string;
      newStatus:        string;
      totalRefundedAfter: number;
      totalPaidMinor:   number;
      currency:         string;
    };

    try {
      refundResult = await this.dataSource.transaction(async (manager) => {

        // ── 1. Lock BookingEntity first ────────────────────────────────
        const booking = await manager
          .createQueryBuilder(BookingEntity, 'b')
          .setLock('pessimistic_write')
          .where('b.id        = :id',        { id: bookingId })
          .andWhere('b.tenantId = :tenantId', { tenantId })
          .andWhere('b.isDeleted = false')
          .getOne();

        if (!booking) {
          throw new NotFoundException(`Booking ${bookingId} not found`);
        }
        if (booking.status !== 'cancelled' && booking.status !== 'no_show') {
          throw new UnprocessableEntityException(
            `Booking ${bookingId} status "${booking.status}" is not eligible for refund. ` +
            `Only cancelled and no_show bookings can be refunded.`,
          );
        }

        // ── 2. Load ALL paid payments (IDs only) then lock in id order ─
        // Consistent ascending-id lock order prevents deadlock.
        const paidPaymentIds = await manager
          .createQueryBuilder(BookingPaymentEntity, 'p')
          .select('p.id', 'id')
          .where('p.bookingId  = :bookingId', { bookingId })
          .andWhere('p.tenantId = :tenantId',  { tenantId })
          .andWhere("p.status   = 'paid'")
          .andWhere('p.isDeleted = false')
          .orderBy('p.id', 'ASC')   // deterministic lock order
          .getRawMany<{ id: string }>();

        if (!paidPaymentIds.length) {
          throw new UnprocessableEntityException(
            `No paid payments found for booking ${bookingId}`,
          );
        }

        // Lock each payment row FOR UPDATE in deterministic id order
        const paidPayments: BookingPaymentEntity[] = [];
        for (const { id } of paidPaymentIds) {
          const locked = await manager
            .createQueryBuilder(BookingPaymentEntity, 'p')
            .setLock('pessimistic_write')
            .where('p.id       = :id',       { id })
            .andWhere('p.tenantId = :tenantId', { tenantId })
            .getOne();
          if (locked) paidPayments.push(locked);
        }

        // ── 3. Booking-level capacity ─────────────────────────────────
        //   totalPaidMinor = SUM(payment.amountMinor) across ALL paid payments
        const totalPaidMinor = paidPayments.reduce((s, p) => s + p.amountMinor, 0);
        const currency = paidPayments[0]!.currency;

        //   committedRefundMinor = SUM of non-failed/rejected booking refunds
        const sumRow = await manager
          .createQueryBuilder(BookingRefundEntity, 'r')
          .select('COALESCE(SUM(r.amountMinor), 0)::int', 'total')
          .where('r.bookingId  = :bookingId', { bookingId })
          .andWhere('r.tenantId = :tenantId',  { tenantId })
          .andWhere("r.status   IN ('pending', 'processed')")
          .andWhere('r.isDeleted = false')
          .getRawOne<{ total: string }>();
        const committedRefundMinor = parseInt(sumRow?.total ?? '0', 10);

        const remainingCapacity = totalPaidMinor - committedRefundMinor;
        if (dto.amountMinor > remainingCapacity) {
          throw new BadRequestException(
            `Refund amount (${dto.amountMinor}) exceeds remaining refund capacity ` +
            `(${remainingCapacity} of ${totalPaidMinor} total paid)`,
          );
        }

        // ── 4. Persist BookingRefundEntity ────────────────────────────
        // primaryPaymentId = first paid payment (for the legacy paymentId column)
        const primaryPaymentId = paidPayments[0]!.id;
        const newRefund = manager.create(BookingRefundEntity, {
          tenantId,
          branchId:       booking.branchId,
          bookingId,
          paymentId:      primaryPaymentId,
          status:         'pending',
          reason:         dto.reason,
          amountMinor:    dto.amountMinor,
          currency,
          reasonNotes:    dto.reasonNotes ?? null,
          idempotencyKey: dto.idempotencyKey,
          createdById:    actorId,
        });
        const savedRefund = await manager.save(newRefund);

        // ── 5. Allocate refund across payments (ascending id order) ───
        // For each payment compute paymentRefundableMinor and fill from it
        // until dto.amountMinor is exhausted. Deterministic: ascending id.
        const allocations: { paymentId: string; allocAmount: number }[] = [];
        let remaining = dto.amountMinor;

        for (const payment of paidPayments) {
          if (remaining <= 0) break;
          const refundable = payment.amountMinor - payment.amountRefundedMinor;
          if (refundable <= 0) continue;
          const allocAmount = Math.min(remaining, refundable);
          allocations.push({ paymentId: payment.id, allocAmount });
          remaining -= allocAmount;
        }

        if (remaining !== 0) {
          // Should never happen — guard above ensures dto.amountMinor <= remainingCapacity
          throw new Error(
            `BUG: Allocation remainder ${remaining} ≠ 0 after distributing ${dto.amountMinor}`,
          );
        }

        // Assert allocation integrity
        const allocSum = allocations.reduce((s, a) => s + a.allocAmount, 0);
        if (allocSum !== dto.amountMinor) {
          throw new Error(
            `BUG: Allocation sum ${allocSum} ≠ dto.amountMinor ${dto.amountMinor}`,
          );
        }

        // Insert allocation rows and update each payment's amountRefundedMinor
        for (const alloc of allocations) {
          const allocRow = manager.create(BookingRefundPaymentAllocationEntity, {
            tenantId,
            bookingRefundId:  savedRefund.id,
            bookingPaymentId: alloc.paymentId,
            amountMinor:      alloc.allocAmount,
          });
          await manager.save(allocRow);

          // Update payment.amountRefundedMinor atomically
          const payment = paidPayments.find((p) => p.id === alloc.paymentId)!;
          await manager.update(BookingPaymentEntity, { id: alloc.paymentId, tenantId }, {
            amountRefundedMinor: payment.amountRefundedMinor + alloc.allocAmount,
            updatedAt:           new Date(),
          });
        }

        // ── 6. Update BookingEntity.amountRefundedMinor ───────────────
        const totalRefundedAfter = committedRefundMinor + dto.amountMinor;
        await manager.update(BookingEntity, { id: bookingId, tenantId }, {
          amountRefundedMinor: totalRefundedAfter,
          updatedAt:           new Date(),
          updatedById:         actorId,
        });

        // ── 7. Status transition ──────────────────────────────────────
        // Full refund: totalRefundedAfter >= totalPaidMinor (NOT vs remainingCapacity)
        // paid=100, prior=30, new=40 → totalAfter=70 < 100 → NOT full  ✅
        // paid=100, prior=30, new=70 → totalAfter=100 >= 100 → full    ✅
        const isFullRefund = totalRefundedAfter >= totalPaidMinor;
        if (isFullRefund) {
          await manager.update(BookingEntity, { id: bookingId, tenantId }, {
            status:      'refunded',
            updatedAt:   new Date(),
            updatedById: actorId,
          });
        }

        return {
          refund:             savedRefund,
          previousStatus:     booking.status,
          newStatus:          isFullRefund ? 'refunded' : booking.status,
          totalRefundedAfter,
          totalPaidMinor,
          currency,
        };
      });

    } catch (err: unknown) {
      // ── Idempotency race: catch 23505 on uq_booking_refunds_idempotency ─
      // Two concurrent requests with the same key both pass the pre-tx check,
      // both enter the transaction; the second hits the UNIQUE constraint.
      // We catch it here, load the winner's row, and return it cleanly.
      const msg = (err as Error).message ?? '';
      const isUniqueViolation =
        msg.includes('uq_booking_refunds_idempotency') ||
        ((err as any).code === '23505' &&
          (msg.includes('idempotency_key') || msg.includes('idempotency')));

      if (isUniqueViolation) {
        this.logger.warn(
          `processRefund: 23505 race on idempotency key ${dto.idempotencyKey} — ` +
          `loading winner row and returning idempotent result`,
        );
        const winner = await this.dataSource
          .getRepository(BookingRefundEntity)
          .findOne({ where: { tenantId, idempotencyKey: dto.idempotencyKey, isDeleted: false } });
        if (!winner) {
          // Extremely rare: winner row was soft-deleted between the violation and this read.
          throw new ConflictException(
            `Concurrent refund with the same idempotency key. Please retry.`,
          );
        }
        return winner;
      }

      // Any other error (capacity exceeded, bad booking status, etc.) re-throws normally
      throw err;
    }

    // ── Post-commit operations ────────────────────────────────────────────
    // Audit log and event only fire when a NEW refund was created.

    await this.logRepository.insert({
      tenantId,
      bookingId,
      action:         'refunded',
      actorId,
      actorType:      'user',
      previousStatus: refundResult.previousStatus,
      newStatus:      refundResult.newStatus,
      note: `Refund ${refundResult.refund.id}: ${dto.amountMinor} ${refundResult.currency}`,
    });

    // BookingEvents.REFUNDED — emitted after successful persistence only.
    // Idempotent retries (pre-tx or 23505 path) do NOT reach this line.
    await this.eventEmitter.emitAsync(BookingEvents.REFUNDED, {
      tenantId,
      bookingId,
      bookingRefundId: refundResult.refund.id,
      amountMinor:     dto.amountMinor,
      currency:        refundResult.currency,
      actorId,
      timestamp:       new Date().toISOString(),
    });

    this.logger.log(
      `processRefund: booking ${bookingId} — refund ${refundResult.refund.id} ` +
      `(${dto.amountMinor} ${refundResult.currency}) status=${refundResult.newStatus} ` +
      `totalPaid=${refundResult.totalPaidMinor} totalRefunded=${refundResult.totalRefundedAfter} ` +
      `— tenant ${tenantId}`,
    );

    return refundResult.refund;
  }

}

