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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WaitlistService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitlistService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const event_emitter_2 = require("@nestjs/event-emitter");
const typeorm_2 = require("typeorm");
const waitlist_repository_1 = require("../repositories/waitlist.repository");
const waitlist_entry_entity_1 = require("../entities/waitlist-entry.entity");
const slot_repository_1 = require("../../slot/repositories/slot.repository");
const slot_entity_1 = require("../../slot/entities/slot.entity");
const booking_events_1 = require("../../booking/events/booking.events");
const slot_events_1 = require("../../slot/events/slot.events");
const DEFAULT_RESERVATION_TTL_MINS = 30;
let WaitlistService = WaitlistService_1 = class WaitlistService {
    constructor(waitlistRepository, slotRepository, eventEmitter, config, ds) {
        this.waitlistRepository = waitlistRepository;
        this.slotRepository = slotRepository;
        this.eventEmitter = eventEmitter;
        this.config = config;
        this.ds = ds;
        this.logger = new common_1.Logger(WaitlistService_1.name);
        this.reservationTtlMins =
            this.config.get('WAITLIST_RESERVATION_TTL_MINS') ??
                DEFAULT_RESERVATION_TTL_MINS;
    }
    async join(dto, tenantId, actorId) {
        const slot = await this.slotRepository.findById(dto.slotId, tenantId);
        if (!slot)
            throw new common_1.NotFoundException(`Slot ${dto.slotId} not found`);
        if (slot.status === 'available') {
            throw new common_1.BadRequestException('Slot is currently available — please book directly instead of joining the waitlist');
        }
        const existing = await this.waitlistRepository.findDuplicate({
            slotId: dto.slotId,
            tenantId,
            userId: dto.userId ?? null,
            customerId: dto.customerId ?? null,
        });
        if (existing) {
            throw new common_1.ConflictException(`You are already on the waitlist for this slot (position ${existing.position})`);
        }
        const entry = await this.ds.transaction(async (manager) => {
            const [{ max }] = await manager.query(`SELECT MAX(position) AS max FROM waitlist_entries
         WHERE slot_id = $1 AND tenant_id = $2
           AND status = 'waiting' AND is_deleted = FALSE`, [dto.slotId, tenantId]);
            const position = (max ?? 0) + 1;
            return manager.save(manager.create(waitlist_entry_entity_1.WaitlistEntryEntity, {
                tenantId,
                slotId: dto.slotId,
                courtId: dto.courtId,
                branchId: dto.branchId,
                userId: dto.userId ?? null,
                customerId: dto.customerId ?? null,
                customerName: dto.customerName,
                customerEmail: dto.customerEmail ?? null,
                customerPhone: dto.customerPhone ?? null,
                position,
                status: 'waiting',
                notes: dto.notes ?? null,
            }));
        });
        this.logger.log(`Waitlist join — slot=${dto.slotId} pos=${entry.position} tenant=${tenantId}`);
        return entry;
    }
    async leave(id, tenantId) {
        const entry = await this.findOne(id, tenantId);
        if (entry.status !== 'waiting') {
            throw new common_1.BadRequestException(`Cannot leave waitlist — entry status is '${entry.status}'`);
        }
        await this.waitlistRepository.softDelete(id, tenantId);
        this.logger.log(`Waitlist leave — id=${id} tenant=${tenantId}`);
    }
    async findOne(id, tenantId) {
        const entry = await this.waitlistRepository.findById(id, tenantId);
        if (!entry)
            throw new common_1.NotFoundException(`Waitlist entry ${id} not found`);
        return entry;
    }
    async findBySlot(slotId, tenantId) {
        return this.waitlistRepository.findBySlot(slotId, tenantId);
    }
    async findByCustomer(customerId, tenantId) {
        return this.waitlistRepository.findByCustomer(customerId, tenantId);
    }
    async findAll(tenantId, query) {
        const limit = query.limit ?? 20;
        const offset = query.offset ?? 0;
        const params = [tenantId];
        const wheres = ['tenant_id = $1', 'is_deleted = FALSE'];
        if (query.slotId) {
            params.push(query.slotId);
            wheres.push(`slot_id = $${params.length}`);
        }
        if (query.customerId) {
            params.push(query.customerId);
            wheres.push(`customer_id = $${params.length}`);
        }
        if (query.courtId) {
            params.push(query.courtId);
            wheres.push(`court_id = $${params.length}`);
        }
        if (query.status) {
            params.push(query.status);
            wheres.push(`status = $${params.length}`);
        }
        const where = wheres.join(' AND ');
        const [countRows, dataRows] = await Promise.all([
            this.ds.query(`SELECT COUNT(*)::int AS count FROM waitlist_entries WHERE ${where}`, params),
            this.ds.query(`SELECT * FROM waitlist_entries WHERE ${where}
         ORDER BY position ASC, created_at ASC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]),
        ]);
        return { data: dataRows, total: Number(countRows[0]?.count ?? 0) };
    }
    async promoteNext(slotId, tenantId) {
        const candidate = await this.waitlistRepository.firstWaiting(slotId, tenantId);
        if (!candidate)
            return null;
        const promoted = await this.ds.transaction(async (manager) => {
            const [slot] = await manager.query(`SELECT * FROM slots
         WHERE id = $1 AND tenant_id = $2 AND status = 'available' AND is_deleted = FALSE
         FOR UPDATE SKIP LOCKED`, [slotId, tenantId]);
            if (!slot) {
                return null;
            }
            const promotedUntil = new Date(Date.now() + this.reservationTtlMins * 60_000);
            await manager.update(slot_entity_1.SlotEntity, { id: slotId, tenantId }, {
                status: 'reserved',
                reservedUntil: promotedUntil,
                updatedAt: new Date(),
            });
            await manager.update(waitlist_entry_entity_1.WaitlistEntryEntity, { id: candidate.id, tenantId }, {
                status: 'promoted',
                promotedAt: new Date(),
                promotedUntil,
                updatedAt: new Date(),
            });
            return manager.findOneOrFail(waitlist_entry_entity_1.WaitlistEntryEntity, {
                where: { id: candidate.id, tenantId },
            });
        });
        if (!promoted)
            return null;
        this.logger.log(`Waitlist promoted — entry=${promoted.id} slot=${slotId} ` +
            `customer=${promoted.customerName} until=${promoted.promotedUntil?.toISOString()}`);
        await this.eventEmitter.emitAsync(booking_events_1.BookingEvents.CONFIRMED, {
            tenantId,
            bookingId: promoted.id,
            actorId: 'waitlist',
            timestamp: new Date().toISOString(),
            _waitlistPromotion: true,
            customerEmail: promoted.customerEmail,
            customerName: promoted.customerName,
            slotId,
        });
        return promoted;
    }
    async markBooked(entryId, tenantId, bookingId) {
        await this.waitlistRepository.update(entryId, tenantId, {
            status: 'booked',
            bookingId,
        });
    }
    async onSlotsReleased(payload) {
        const { tenantId, slotIds, reason } = payload;
        this.logger.debug(`[waitlist] SLOTS_RELEASED — ${slotIds.length} slot(s) released (${reason})`);
        for (const slotId of slotIds) {
            try {
                const promoted = await this.promoteNext(slotId, tenantId);
                if (promoted) {
                    this.logger.log(`[waitlist] Auto-promoted entry=${promoted.id} for slot=${slotId}`);
                }
            }
            catch (err) {
                this.logger.warn(`[waitlist] promoteNext failed for slot=${slotId}: ${err instanceof Error ? err.message : String(err)}`);
            }
        }
    }
    async sweepExpiredPromotions() {
        try {
            const expired = await this.waitlistRepository.findExpiredPromotions(50);
            if (!expired.length)
                return;
            this.logger.log(`[waitlist:sweep] Expiring ${expired.length} promotion(s)`);
            for (const entry of expired) {
                try {
                    await this.ds.transaction(async (manager) => {
                        await manager.update(waitlist_entry_entity_1.WaitlistEntryEntity, { id: entry.id, tenantId: entry.tenantId }, { status: 'expired', updatedAt: new Date() });
                        await manager.update(slot_entity_1.SlotEntity, { id: entry.slotId, tenantId: entry.tenantId }, { status: 'available', reservedUntil: null, updatedAt: new Date() });
                    });
                    this.logger.log(`[waitlist:sweep] Entry ${entry.id} expired — re-promoting slot ${entry.slotId}`);
                    await this.promoteNext(entry.slotId, entry.tenantId);
                }
                catch (err) {
                    this.logger.warn(`[waitlist:sweep] Failed to expire entry ${entry.id}: ${err instanceof Error ? err.message : String(err)}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[waitlist:sweep] Sweep failed: ${err instanceof Error ? err.message : String(err)}`);
        }
    }
};
exports.WaitlistService = WaitlistService;
__decorate([
    (0, event_emitter_1.OnEvent)(slot_events_1.SlotEvents.SLOTS_RELEASED),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WaitlistService.prototype, "onSlotsReleased", null);
__decorate([
    (0, schedule_1.Cron)('* * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WaitlistService.prototype, "sweepExpiredPromotions", null);
exports.WaitlistService = WaitlistService = WaitlistService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [waitlist_repository_1.WaitlistRepository,
        slot_repository_1.SlotRepository,
        event_emitter_2.EventEmitter2,
        config_1.ConfigService,
        typeorm_2.DataSource])
], WaitlistService);
//# sourceMappingURL=waitlist.service.js.map