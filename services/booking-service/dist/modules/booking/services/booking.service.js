"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BookingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("typeorm");
const booking_repository_1 = require("../repositories/booking.repository");
const booking_support_repository_1 = require("../repositories/booking-support.repository");
const booking_validation_service_1 = require("./booking-validation.service");
const booking_utils_1 = require("../utils/booking.utils");
const booking_events_1 = require("../events/booking.events");
const slot_events_1 = require("../../slot/events/slot.events");
const pricing_rule_repository_1 = require("../../slot/repositories/pricing-rule.repository");
const booking_entity_1 = require("../entities/booking.entity");
const slot_repository_1 = require("../../slot/repositories/slot.repository");
const DEFAULT_RESERVATION_TTL_MINS = 15;
const ALLOWED_TRANSITIONS = {
    reserved: ['pending_payment', 'cancelled', 'expired'],
    pending_payment: ['confirmed', 'cancelled', 'expired'],
    confirmed: ['checked_in', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    checked_in: ['in_progress', 'completed'],
    in_progress: ['completed'],
    completed: [],
    cancelled: ['refunded'],
    no_show: ['refunded'],
    rescheduled: [],
    refunded: [],
    expired: [],
};
let BookingService = BookingService_1 = class BookingService {
    constructor(bookingRepository, logRepository, validationService, slotRepository, pricingRuleRepository, eventEmitter, dataSource, configService) {
        this.bookingRepository = bookingRepository;
        this.logRepository = logRepository;
        this.validationService = validationService;
        this.slotRepository = slotRepository;
        this.pricingRuleRepository = pricingRuleRepository;
        this.eventEmitter = eventEmitter;
        this.dataSource = dataSource;
        this.configService = configService;
        this.logger = new common_1.Logger(BookingService_1.name);
    }
    async create(dto, tenantId, actorId) {
        await this.validationService.validateCourtAndVenue(dto.courtId, tenantId);
        const slots = await this.validationService.validateSlotsForBooking(dto.slotIds, tenantId, dto.courtId);
        const sortedSlots = [...slots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        const startsAt = sortedSlots[0].startAt;
        const endsAt = sortedSlots[sortedSlots.length - 1].endAt;
        const totalMins = sortedSlots.reduce((s, sl) => s + sl.durationMins, 0);
        const totalPrice = slots.every((s) => s.effectivePriceMinor !== null)
            ? slots.reduce((s, sl) => s + (sl.effectivePriceMinor ?? 0), 0)
            : null;
        const currency = slots[0].currency;
        const reference = booking_utils_1.BookingUtils.generateReference();
        const booking = await this.dataSource.transaction(async (manager) => {
            await this.slotRepository.lockAndVerifyAvailable(dto.slotIds, tenantId, manager);
            if (dto.couponCode) {
                const slotDate = sortedSlots[0].startAt.toISOString().slice(0, 10);
                const couponRule = await this.pricingRuleRepository.findCouponRule(dto.couponCode, tenantId, slotDate);
                if (!couponRule) {
                    throw new common_1.BadRequestException(`Coupon code "${dto.couponCode}" is invalid or expired`);
                }
                if (couponRule.maxRedemptions !== null && couponRule.redemptionCount >= couponRule.maxRedemptions) {
                    throw new common_1.BadRequestException(`Coupon code "${dto.couponCode}" has been fully redeemed`);
                }
                await this.pricingRuleRepository.incrementRedemption(couponRule.id, tenantId, manager);
            }
            const b = await manager.save(manager.create(booking_entity_1.BookingEntity, {
                tenantId,
                reference,
                branchId: dto.branchId,
                courtId: dto.courtId,
                sportId: dto.sportId ?? null,
                slotIds: dto.slotIds,
                userId: dto.customer.userId ?? null,
                customerName: dto.customer.name,
                customerEmail: dto.customer.email,
                customerPhone: dto.customer.phone ?? null,
                isMember: dto.customer.isMember ?? false,
                channel: dto.channel ?? 'online',
                status: 'pending_payment',
                startsAt,
                endsAt,
                totalDurationMins: totalMins,
                finalPriceMinor: totalPrice,
                amountPaidMinor: 0,
                amountRefundedMinor: 0,
                currency,
                participantCount: dto.participantCount ?? 1,
                customerNotes: dto.customerNotes ?? null,
                internalNotes: dto.internalNotes ?? null,
                metadata: dto.metadata ?? null,
                createdById: actorId,
                updatedById: actorId,
            }));
            for (const slot of slots) {
                await manager.update((await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity, { id: slot.id, tenantId }, {
                    status: 'reserved',
                    bookingId: b.id,
                    reservedUntil: new Date(Date.now() + 30 * 60_000),
                    updatedAt: new Date(),
                });
            }
            return b;
        });
        await this.logRepository.insert({
            tenantId,
            bookingId: booking.id,
            action: 'created',
            actorId,
            actorType: 'user',
            newStatus: 'pending_payment',
        });
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.CREATED, {
            tenantId, bookingId: booking.id, actorId, timestamp: new Date().toISOString(),
        });
        this.logger.log(`Booking created: ${booking.reference} tenant=${tenantId}`);
        if (dto.recurrence) {
            void this.generateRecurringSeries(booking, dto, tenantId, actorId);
        }
        return booking;
    }
    async findAll(query, tenantId) {
        return this.bookingRepository.query({
            tenantId,
            branchId: query.branchId,
            courtId: query.courtId,
            sportId: query.sportId,
            userId: query.userId,
            reference: query.reference,
            status: query.status,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            limit: query.limit ?? 50,
            offset: query.offset ?? 0,
        });
    }
    async findOne(id, tenantId) {
        const b = await this.bookingRepository.findById(id, tenantId);
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        return b;
    }
    async findByReference(reference, tenantId) {
        const b = await this.bookingRepository.findByReference(reference, tenantId);
        if (!b)
            throw new common_1.NotFoundException('Booking not found');
        return b;
    }
    async getStatusSummary(tenantId) {
        return this.bookingRepository.countByStatus(tenantId);
    }
    async reserve(id, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.assertTransitionAllowed(booking.status, 'reserved');
        const ttlMins = this.configService.get('BOOKING_RESERVATION_TTL_MINS', DEFAULT_RESERVATION_TTL_MINS);
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
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.RESERVED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async expire(id, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.assertTransitionAllowed(booking.status, 'expired');
        const updated = await this.dataSource.transaction(async (manager) => {
            const SlotEntity = (await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity;
            for (const slotId of booking.slotIds) {
                await manager.update(SlotEntity, { id: slotId, tenantId }, { status: 'available', bookingId: null, updatedAt: new Date() });
            }
            await manager.update(booking_entity_1.BookingEntity, { id, tenantId }, { status: 'expired', expiresAt: null, updatedById: actorId, updatedAt: new Date() });
            return manager.findOneOrFail(booking_entity_1.BookingEntity, { where: { id, tenantId } });
        });
        await this.logRepository.insert({
            tenantId, bookingId: id,
            action: 'status_changed', actorId, actorType: 'system',
            previousStatus: booking.status, newStatus: 'expired',
        });
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.EXPIRED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.SLOTS_RELEASED, {
            tenantId, bookingId: id, slotIds: booking.slotIds,
            reason: 'expired', actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async confirm(id, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.assertTransitionAllowed(booking.status, 'confirmed');
        const updated = await this.dataSource.transaction(async (manager) => {
            const b = await this.bookingRepository.updateById(id, tenantId, {
                status: 'confirmed',
                updatedById: actorId,
            });
            for (const slotId of booking.slotIds) {
                await manager.update((await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity, { id: slotId, tenantId }, { status: 'booked', reservedUntil: null, updatedAt: new Date() });
            }
            return b;
        });
        await this.logRepository.insert({
            tenantId, bookingId: id, action: 'confirmed',
            actorId, actorType: 'user',
            previousStatus: booking.status, newStatus: 'confirmed',
        });
        await this.emitStatusChange(tenantId, id, actorId, booking.status, 'confirmed');
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.CONFIRMED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        void this.createInvoiceForBooking(updated, tenantId, actorId);
        return updated;
    }
    async cancel(id, dto, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.validationService.assertCancellable(booking);
        const updated = await this.dataSource.transaction(async (manager) => {
            const b = await this.bookingRepository.updateById(id, tenantId, {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledById: dto.cancelledById ?? actorId,
                cancellationReason: dto.reason,
                updatedById: actorId,
            });
            for (const slotId of booking.slotIds) {
                await manager.update((await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity, { id: slotId, tenantId }, {
                    status: 'available',
                    bookingId: null,
                    reservedUntil: null,
                    updatedAt: new Date(),
                });
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
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.CANCELLED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.SLOTS_RELEASED, {
            tenantId, bookingId: id, slotIds: booking.slotIds,
            reason: 'cancelled', actorId, timestamp: new Date().toISOString(),
        });
        void this.voidInvoiceForBooking(id, tenantId, actorId, dto.reason ?? 'booking cancelled');
        this.logger.log(`Booking cancelled: ${booking.reference} reason="${dto.reason}"`);
        return updated;
    }
    async reschedule(id, dto, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.validationService.assertReschedulable(booking);
        const newSlots = await this.validationService.validateSlotsForReschedule(dto.newSlotIds, booking.slotIds, tenantId, booking.courtId, id);
        const sortedNew = [...newSlots].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        const newStart = sortedNew[0].startAt;
        const newEnd = sortedNew[sortedNew.length - 1].endAt;
        const newMins = newSlots.reduce((s, sl) => s + sl.durationMins, 0);
        const newPrice = newSlots.every((s) => s.effectivePriceMinor !== null)
            ? newSlots.reduce((s, sl) => s + (sl.effectivePriceMinor ?? 0), 0)
            : null;
        const previousSlotIds = [...booking.slotIds];
        const updated = await this.dataSource.transaction(async (manager) => {
            const SlotEntity = (await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity;
            await this.slotRepository.lockAndVerifyAvailable(dto.newSlotIds, tenantId, manager);
            for (const slotId of previousSlotIds) {
                await manager.update(SlotEntity, { id: slotId, tenantId }, {
                    status: 'available', bookingId: null, reservedUntil: null, updatedAt: new Date(),
                });
            }
            for (const slot of newSlots) {
                await manager.update(SlotEntity, { id: slot.id, tenantId }, {
                    status: 'booked', bookingId: id, reservedUntil: null, updatedAt: new Date(),
                });
            }
            await manager.update(booking_entity_1.BookingEntity, { id, tenantId }, {
                slotIds: dto.newSlotIds,
                startsAt: newStart,
                endsAt: newEnd,
                totalDurationMins: newMins,
                finalPriceMinor: newPrice,
                updatedById: actorId,
                updatedAt: new Date(),
            });
            return manager.findOneOrFail(booking_entity_1.BookingEntity, { where: { id, tenantId } });
        });
        await this.logRepository.insert({
            tenantId, bookingId: id, action: 'rescheduled',
            actorId, actorType: 'user',
            diff: booking_utils_1.BookingUtils.sanitiseDiff({
                previousSlotIds,
                newSlotIds: dto.newSlotIds,
                reason: dto.reason,
            }),
            note: dto.reason ?? null,
        });
        const payload = {
            tenantId, bookingId: id, actorId,
            previousSlotIds, newSlotIds: dto.newSlotIds,
            reason: dto.reason ?? null,
            timestamp: new Date().toISOString(),
        };
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.RESCHEDULED, payload);
        this.logger.log(`Booking rescheduled: ${booking.reference} tenant=${tenantId}`);
        return updated;
    }
    async checkIn(id, dto, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.validationService.assertCheckInAllowed(booking);
        const updated = await this.bookingRepository.updateById(id, tenantId, {
            checkedInAt: new Date(),
            updatedById: actorId,
        });
        await this.logRepository.insert({
            tenantId, bookingId: id, action: 'checked_in', actorId, actorType: 'user',
        });
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.CHECKED_IN, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async markNoShow(id, dto, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.validationService.assertNoShowMarkable(booking);
        const updated = await this.dataSource.transaction(async (manager) => {
            const SlotEntity = (await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity;
            for (const slotId of booking.slotIds) {
                await manager.update(SlotEntity, { id: slotId, tenantId }, {
                    status: 'completed', updatedAt: new Date(),
                });
            }
            return this.bookingRepository.updateById(id, tenantId, {
                status: 'no_show',
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
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.NO_SHOW_MARKED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        this.logger.log(`No-show marked: ${booking.reference} tenant=${tenantId}`);
        return updated;
    }
    async waiveNoShow(id, dto, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        if (booking.status !== 'no_show') {
            throw new common_1.BadRequestException('Only no-show bookings can be waived');
        }
        const updated = await this.bookingRepository.updateById(id, tenantId, {
            status: 'completed',
            completedAt: new Date(),
            updatedById: actorId,
        });
        await this.logRepository.insert({
            tenantId, bookingId: id, action: 'no_show_waived',
            actorId, actorType: 'admin',
            previousStatus: 'no_show', newStatus: 'completed',
            note: dto.reason,
        });
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.NO_SHOW_WAIVED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async markInProgress(id, tenantId, actorId) {
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
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.IN_PROGRESS, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async complete(id, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.assertTransitionAllowed(booking.status, 'completed');
        const updated = await this.dataSource.transaction(async (manager) => {
            const SlotEntity = (await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity;
            for (const slotId of booking.slotIds) {
                await manager.update(SlotEntity, { id: slotId, tenantId }, {
                    status: 'completed', updatedAt: new Date(),
                });
            }
            return this.bookingRepository.updateById(id, tenantId, {
                status: 'completed',
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
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.COMPLETED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async paymentFailed(id, dto, tenantId, actorId) {
        const booking = await this.findOne(id, tenantId);
        this.validationService.assertPaymentFailable(booking);
        const updated = await this.dataSource.transaction(async (manager) => {
            const SlotEntity = (await Promise.resolve().then(() => __importStar(require('../../slot/entities/slot.entity')))).SlotEntity;
            for (const slotId of booking.slotIds) {
                await manager.update(SlotEntity, { id: slotId, tenantId }, {
                    status: 'available',
                    bookingId: null,
                    reservedUntil: null,
                    updatedAt: new Date(),
                });
            }
            return this.bookingRepository.updateById(id, tenantId, {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledById: actorId,
                cancellationReason: `Payment failed: ${dto.reason ?? dto.providerErrorMessage ?? 'gateway declined'}`,
                updatedById: actorId,
            });
        });
        await this.logRepository.insert({
            tenantId, bookingId: id, action: 'payment_failed',
            actorId, actorType: 'system',
            previousStatus: 'pending_payment', newStatus: 'cancelled',
            diff: {
                reason: dto.reason,
                providerErrorCode: dto.providerErrorCode,
                providerErrorMessage: dto.providerErrorMessage,
            },
        });
        await this.emitStatusChange(tenantId, id, actorId, 'pending_payment', 'cancelled');
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.CANCELLED, {
            tenantId, bookingId: id, actorId, timestamp: new Date().toISOString(),
        });
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.SLOTS_RELEASED, {
            tenantId, bookingId: id, slotIds: booking.slotIds,
            reason: 'cancelled', actorId, timestamp: new Date().toISOString(),
        });
        this.logger.warn(`Payment failed for booking ${booking.reference}: ${dto.reason ?? dto.providerErrorCode}`);
        return updated;
    }
    async generateRecurringSeries(parent, dto, tenantId, actorId) {
        if (!dto.recurrence)
            return;
        const { frequency, occurrences, until } = dto.recurrence;
        const offsets = booking_utils_1.BookingUtils.recurrenceOffsets(frequency, occurrences, until);
        const generatedIds = [];
        for (const offsetDays of offsets) {
            try {
                const originalSlots = await Promise.all(parent.slotIds.map((sid) => this.slotRepository.findById(sid, tenantId)));
                const shiftedSlotIds = [];
                for (const originalSlot of originalSlots) {
                    if (!originalSlot)
                        continue;
                    const newStart = new Date(originalSlot.startAt.getTime() + offsetDays * 86_400_000);
                    const newEnd = new Date(originalSlot.endAt.getTime() + offsetDays * 86_400_000);
                    const candidates = await this.slotRepository.query({
                        tenantId,
                        courtId: originalSlot.courtId,
                        from: newStart,
                        to: new Date(newStart.getTime() + 60_000),
                        status: 'available',
                    });
                    const match = candidates.find((c) => c.startAt.getTime() === newStart.getTime()
                        && c.endAt.getTime() === newEnd.getTime());
                    if (match)
                        shiftedSlotIds.push(match.id);
                }
                if (shiftedSlotIds.length !== parent.slotIds.length)
                    continue;
                const child = await this.create({
                    ...dto,
                    slotIds: shiftedSlotIds,
                    recurrence: undefined,
                }, tenantId, actorId);
                generatedIds.push(child.id);
            }
            catch (err) {
                const isConflict = err instanceof Error && (err.message.includes('no longer available') ||
                    err.message.includes('overlaps') ||
                    err.message.includes('ConflictException') ||
                    err.constructor?.name === 'ConflictException' ||
                    err.constructor?.name === 'UnprocessableEntityException');
                if (isConflict) {
                    this.logger.warn(`Recurring offset=${offsetDays}d SKIPPED (slot conflict): ${err instanceof Error ? err.message : String(err)}`);
                }
                else {
                    this.logger.error(`Recurring offset=${offsetDays}d FAILED (unexpected): ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
                }
            }
        }
        if (generatedIds.length > 0) {
            await this.logRepository.insert({
                tenantId,
                bookingId: parent.id,
                action: 'recurring_generated',
                actorId,
                actorType: 'system',
                diff: { generatedIds, frequency, occurrences },
            });
            const payload = {
                tenantId,
                bookingId: parent.id,
                actorId,
                parentBookingId: parent.id,
                generatedIds,
                frequency,
                timestamp: new Date().toISOString(),
            };
            await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.RECURRING_GENERATED, payload);
            this.logger.log(`Recurring series: parent=${parent.id} generated=${generatedIds.length} tenant=${tenantId}`);
        }
    }
    async autoExpireReservations() {
        const batchSize = this.configService.get('BOOKING_SCHEDULER_BATCH_SIZE', 50);
        const candidates = await this.bookingRepository.findExpiredReservations(batchSize);
        let count = 0;
        for (const b of candidates) {
            try {
                await this.expire(b.id, b.tenantId, 'system');
                count++;
            }
            catch (err) {
                this.logger.warn(`autoExpireReservations: failed for ${b.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoExpireReservations: expired ${count} bookings`);
        return count;
    }
    async autoMarkInProgress(tenantId) {
        const batchSize = this.configService.get('BOOKING_SCHEDULER_BATCH_SIZE', 50);
        const candidates = await this.bookingRepository.findStartedConfirmed(tenantId, batchSize);
        let count = 0;
        for (const b of candidates) {
            try {
                await this.markInProgress(b.id, b.tenantId, 'system');
                count++;
            }
            catch (err) {
                this.logger.warn(`autoMarkInProgress: failed for ${b.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoMarkInProgress: ${count} bookings in_progress — tenant ${tenantId}`);
        return count;
    }
    async autoCompleteExpired(tenantId) {
        const batchSize = this.configService.get('BOOKING_SCHEDULER_BATCH_SIZE', 50);
        const delayMins = this.configService.get('BOOKING_AUTOCOMPLETE_DELAY_MINS', 0);
        const before = new Date(Date.now() - delayMins * 60_000);
        const expired = await this.bookingRepository.findPastConfirmed(tenantId, before, batchSize);
        let count = 0;
        for (const b of expired) {
            try {
                await this.complete(b.id, tenantId, 'system');
                count++;
            }
            catch (err) {
                this.logger.warn(`autoCompleteExpired: failed for ${b.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoCompleteExpired: completed ${count} bookings — tenant ${tenantId}`);
        return count;
    }
    async autoMarkNoShows(tenantId) {
        const batchSize = this.configService.get('BOOKING_SCHEDULER_BATCH_SIZE', 50);
        const graceMins = this.configService.get('BOOKING_NO_SHOW_GRACE_MINS', 30);
        const candidates = await this.bookingRepository.findNoShowCandidates(tenantId, graceMins, batchSize);
        let count = 0;
        for (const b of candidates) {
            try {
                await this.markNoShow(b.id, { notes: 'Auto-marked by system after grace period' }, tenantId, 'system');
                count++;
            }
            catch (err) {
                this.logger.warn(`autoMarkNoShows: failed for ${b.id} — ${err.message}`);
            }
        }
        if (count)
            this.logger.log(`autoMarkNoShows: marked ${count} no-shows — tenant ${tenantId}`);
        return count;
    }
    assertTransitionAllowed(from, to) {
        const allowed = ALLOWED_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new common_1.BadRequestException(`Cannot transition booking from "${from}" to "${to}". ` +
                `Allowed: [${allowed.join(', ') || 'none'}]`);
        }
    }
    async emitStatusChange(tenantId, bookingId, actorId, from, to) {
        const payload = {
            tenantId, bookingId, actorId,
            previousStatus: from, newStatus: to,
            timestamp: new Date().toISOString(),
        };
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.STATUS_CHANGED, payload);
    }
    async voidInvoiceForBooking(bookingId, _tenantId, _actorId, _reason) {
        this.logger.debug(`voidInvoiceForBooking: finance integration pending — booking ${bookingId}`);
    }
    async createInvoiceForBooking(booking, _tenantId, _actorId) {
        this.logger.debug(`createInvoiceForBooking: finance integration pending — booking ${booking.id}`);
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = BookingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [booking_repository_1.BookingRepository,
        booking_support_repository_1.BookingLogRepository,
        booking_validation_service_1.BookingValidationService,
        slot_repository_1.SlotRepository,
        pricing_rule_repository_1.PricingRuleRepository,
        event_emitter_1.EventEmitter2,
        typeorm_1.DataSource,
        config_1.ConfigService])
], BookingService);
//# sourceMappingURL=booking.service.js.map