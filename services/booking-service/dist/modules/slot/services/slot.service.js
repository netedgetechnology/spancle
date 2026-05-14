"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SlotService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const slot_repository_1 = require("../repositories/slot.repository");
const slot_utils_1 = require("../utils/slot.utils");
const slot_events_1 = require("../events/slot.events");
/**
 * Allowed status transitions.
 * Terminal states (completed, cancelled) have no outbound transitions.
 */
const ALLOWED_TRANSITIONS = {
    available: ['reserved', 'booked', 'unavailable', 'cancelled'],
    reserved: ['available', 'booked', 'cancelled'],
    booked: ['completed', 'cancelled'],
    unavailable: ['available', 'cancelled'],
    cancelled: [],
    completed: [],
};
/** Default reservation TTL: 15 minutes */
const RESERVATION_TTL_MINS = 15;
let SlotService = SlotService_1 = class SlotService {
    constructor(slotRepository, eventEmitter) {
        this.slotRepository = slotRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SlotService_1.name);
    }
    // ── Create ─────────────────────────────────────────────────────────────────
    async create(dto, tenantId, actorId) {
        const startAt = new Date(dto.startAt);
        const endAt = new Date(dto.endAt);
        if (endAt <= startAt) {
            throw new common_1.BadRequestException('endAt must be after startAt');
        }
        const durationMins = slot_utils_1.SlotUtils.durationMins(startAt, endAt);
        if (durationMins < 15) {
            throw new common_1.BadRequestException('Slot duration must be at least 15 minutes');
        }
        // Overlap pre-check
        const overlaps = await this.slotRepository.countOverlapping({
            tenantId, courtId: dto.courtId, startAt, endAt,
        });
        if (overlaps > 0) {
            throw new common_1.BadRequestException('This time window overlaps with an existing slot on this court');
        }
        const slot = await this.slotRepository.create({
            tenantId,
            courtId: dto.courtId,
            branchId: dto.branchId,
            sportId: dto.sportId ?? null,
            startAt,
            endAt,
            durationMins,
            status: dto.status ?? 'available',
            priceOverrideMinor: dto.priceOverrideMinor ?? null,
            currency: 'GBP',
            label: dto.label ?? slot_utils_1.SlotUtils.buildLabel('Court', startAt, endAt),
            notes: dto.notes ?? null,
            maxBookings: dto.maxBookings ?? 1,
            currentBookings: 0,
        });
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.CREATED, {
            tenantId, slotId: slot.id, actorId, timestamp: new Date().toISOString(),
        });
        return slot;
    }
    // ── Read ───────────────────────────────────────────────────────────────────
    async findAll(tenantId, query) {
        return this.slotRepository.query({
            tenantId,
            courtId: query.courtId,
            branchId: query.branchId,
            sportId: query.sportId,
            from: query.from ? new Date(query.from) : undefined,
            to: query.to ? new Date(query.to) : undefined,
            status: query.status,
        });
    }
    async findOne(id, tenantId) {
        const slot = await this.slotRepository.findById(id, tenantId);
        if (!slot)
            throw new common_1.NotFoundException(`Slot ${id} not found`);
        return slot;
    }
    async getStatusSummary(tenantId) {
        return this.slotRepository.countByStatus(tenantId);
    }
    // ── Update ─────────────────────────────────────────────────────────────────
    async update(id, dto, tenantId, actorId) {
        const slot = await this.findOne(id, tenantId);
        if (dto.status && dto.status !== slot.status) {
            this.assertTransitionAllowed(slot.status, dto.status);
        }
        const updated = await this.slotRepository.updateById(id, tenantId, {
            ...(dto.status !== undefined && { status: dto.status }),
            ...(dto.priceOverrideMinor !== undefined && { priceOverrideMinor: dto.priceOverrideMinor }),
            ...(dto.label !== undefined && { label: dto.label }),
            ...(dto.notes !== undefined && { notes: dto.notes }),
            ...(dto.maxBookings !== undefined && { maxBookings: dto.maxBookings }),
        });
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.UPDATED, {
            tenantId, slotId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    // ── Status transitions ─────────────────────────────────────────────────────
    async updateStatus(id, status, tenantId, actorId) {
        const slot = await this.findOne(id, tenantId);
        this.assertTransitionAllowed(slot.status, status);
        const reservedUntil = status === 'reserved'
            ? new Date(Date.now() + RESERVATION_TTL_MINS * 60_000)
            : null;
        const updated = await this.slotRepository.updateById(id, tenantId, {
            status,
            reservedUntil,
        });
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.STATUS_CHANGED, {
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
    async reserve(id, tenantId, actorId) {
        const slot = await this.findOne(id, tenantId);
        if (slot.status !== 'available') {
            throw new common_1.BadRequestException(`Slot is not available for reservation (current status: ${slot.status})`);
        }
        return this.updateStatus(id, 'reserved', tenantId, actorId);
    }
    // ── Scheduler: expire stale reservations ───────────────────────────────────
    async expireStaleReservations(tenantId) {
        const count = await this.slotRepository.expireStaleReservations(tenantId);
        if (count > 0) {
            this.logger.log(`Expired ${count} stale reservations for tenant ${tenantId}`);
        }
        return count;
    }
    // ── Delete ─────────────────────────────────────────────────────────────────
    async remove(id, tenantId, actorId) {
        const slot = await this.findOne(id, tenantId);
        if (slot.status === 'booked') {
            throw new common_1.BadRequestException('A booked slot cannot be deleted. Cancel it first.');
        }
        await this.slotRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.DELETED, {
            tenantId, slotId: id, actorId, timestamp: new Date().toISOString(),
        });
    }
    // ── Private ────────────────────────────────────────────────────────────────
    assertTransitionAllowed(from, to) {
        const allowed = ALLOWED_TRANSITIONS[from] ?? [];
        if (!allowed.includes(to)) {
            throw new common_1.BadRequestException(`Cannot transition slot from "${from}" to "${to}". ` +
                `Allowed: [${allowed.join(', ') || 'none'}]`);
        }
    }
};
exports.SlotService = SlotService;
exports.SlotService = SlotService = SlotService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [slot_repository_1.SlotRepository,
        event_emitter_1.EventEmitter2])
], SlotService);
//# sourceMappingURL=slot.service.js.map