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
var BookingRulesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRulesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_rules_repository_1 = require("../repositories/booking-rules.repository");
const ADMIN_CHANNELS = new Set(['admin', 'walk_in']);
let BookingRulesService = BookingRulesService_1 = class BookingRulesService {
    constructor(rulesRepository, ds) {
        this.rulesRepository = rulesRepository;
        this.ds = ds;
        this.logger = new common_1.Logger(BookingRulesService_1.name);
    }
    async create(dto, tenantId) {
        const scope = dto.scope ?? 'tenant';
        const entity = await this.rulesRepository.create({
            tenantId,
            scope,
            branchId: dto.branchId ?? null,
            sportId: dto.sportId ?? null,
            courtId: dto.courtId ?? null,
            name: dto.name,
            description: dto.description ?? null,
            isActive: dto.isActive ?? true,
            maxAdvanceBookingMins: dto.maxAdvanceBookingMins ?? null,
            minNoticeMins: dto.minNoticeMins ?? null,
            minDurationMins: dto.minDurationMins ?? null,
            maxDurationMins: dto.maxDurationMins ?? null,
            maxBookingsPerDay: dto.maxBookingsPerDay ?? null,
            maxBookingsPerWeek: dto.maxBookingsPerWeek ?? null,
            maxBookingsPerMonth: dto.maxBookingsPerMonth ?? null,
            membersOnly: dto.membersOnly ?? false,
            minAgeYears: dto.minAgeYears ?? null,
            maxAgeYears: dto.maxAgeYears ?? null,
            bufferTimeMins: dto.bufferTimeMins ?? null,
            cancellationCutoffMins: dto.cancellationCutoffMins ?? null,
            rescheduleCutoffMins: dto.rescheduleCutoffMins ?? null,
            gracePeriodMins: dto.gracePeriodMins ?? null,
            blackoutDates: dto.blackoutDates ?? [],
        });
        this.logger.log(`BookingRule created — id=${entity.id} scope=${scope} tenant=${tenantId}`);
        return entity;
    }
    async findAll(tenantId) {
        return this.rulesRepository.findByTenant(tenantId);
    }
    async findOne(id, tenantId) {
        const rule = await this.rulesRepository.findById(id, tenantId);
        if (!rule)
            throw new common_1.NotFoundException(`Booking rule ${id} not found`);
        return rule;
    }
    async update(id, dto, tenantId) {
        await this.findOne(id, tenantId);
        return this.rulesRepository.update(id, tenantId, dto);
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.rulesRepository.softDelete(id, tenantId);
        this.logger.log(`BookingRule soft-deleted — id=${id} tenant=${tenantId}`);
    }
    async enforceCreateRules(params) {
        const { dto, tenantId, startsAt, endsAt, totalMins } = params;
        const rules = await this.rulesRepository.resolveForBooking({
            tenantId,
            branchId: dto.branchId,
            sportId: dto.sportId,
            courtId: dto.courtId,
        });
        if (!rules)
            return;
        const now = new Date();
        const channel = dto.channel ?? 'online';
        const isAdmin = ADMIN_CHANNELS.has(channel);
        const bookingDate = startsAt.toISOString().slice(0, 10);
        if (rules.blackoutDates?.includes(bookingDate)) {
            throw new common_1.BadRequestException(`Bookings are not accepted on ${bookingDate} (blackout date)`);
        }
        if (rules.maxAdvanceBookingMins != null) {
            const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60_000;
            if (minutesUntilStart > rules.maxAdvanceBookingMins) {
                const days = Math.round(rules.maxAdvanceBookingMins / 1440);
                throw new common_1.BadRequestException(`Bookings cannot be made more than ${days} day(s) in advance`);
            }
        }
        if (rules.minNoticeMins != null) {
            const minutesUntilStart = (startsAt.getTime() - now.getTime()) / 60_000;
            if (minutesUntilStart < rules.minNoticeMins) {
                throw new common_1.BadRequestException(`Bookings must be made at least ${rules.minNoticeMins} minute(s) before the session`);
            }
        }
        if (rules.minDurationMins != null && totalMins < rules.minDurationMins) {
            throw new common_1.BadRequestException(`Minimum booking duration is ${rules.minDurationMins} minutes (requested: ${totalMins})`);
        }
        if (rules.maxDurationMins != null && totalMins > rules.maxDurationMins) {
            throw new common_1.BadRequestException(`Maximum booking duration is ${rules.maxDurationMins} minutes (requested: ${totalMins})`);
        }
        if (!isAdmin && rules.membersOnly && !dto.customer.isMember) {
            throw new common_1.BadRequestException('This court / sport is available to members only');
        }
        if (dto.customer.userId) {
            await this.enforceBookingLimits({
                userId: dto.customer.userId,
                tenantId,
                courtId: dto.courtId,
                branchId: dto.branchId,
                startsAt,
                rules,
            });
        }
    }
    async enforceRescheduleRules(params) {
        const { booking, tenantId } = params;
        const rules = await this.rulesRepository.resolveForBooking({
            tenantId,
            branchId: booking.branchId,
            sportId: booking.sportId,
            courtId: booking.courtId,
        });
        if (!rules)
            return;
        if (rules.rescheduleCutoffMins != null && booking.startsAt) {
            const minsUntilStart = (booking.startsAt.getTime() - Date.now()) / 60_000;
            if (minsUntilStart < rules.rescheduleCutoffMins) {
                throw new common_1.BadRequestException(`Rescheduling is not allowed within ${rules.rescheduleCutoffMins} minutes of the session start`);
            }
        }
    }
    async enforceCancellationRules(params) {
        const { booking, tenantId, actorRole } = params;
        if (['TENANT_ADMIN'].includes(actorRole))
            return;
        const rules = await this.rulesRepository.resolveForBooking({
            tenantId,
            branchId: booking.branchId,
            sportId: booking.sportId,
            courtId: booking.courtId,
        });
        if (!rules)
            return;
        if (rules.cancellationCutoffMins != null && booking.startsAt) {
            const minsUntilStart = (booking.startsAt.getTime() - Date.now()) / 60_000;
            if (minsUntilStart < rules.cancellationCutoffMins) {
                throw new common_1.BadRequestException(`Cancellations are not allowed within ${rules.cancellationCutoffMins} minutes of the session start`);
            }
        }
    }
    async enforceBookingLimits(params) {
        const { userId, tenantId, startsAt, rules } = params;
        const startOfDay = new Date(startsAt);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(startsAt);
        endOfDay.setHours(23, 59, 59, 999);
        const dayOfWeek = startsAt.getDay();
        const monday = new Date(startsAt);
        monday.setDate(startsAt.getDate() - ((dayOfWeek + 6) % 7));
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        const startOfMonth = new Date(startsAt.getFullYear(), startsAt.getMonth(), 1);
        const endOfMonth = new Date(startsAt.getFullYear(), startsAt.getMonth() + 1, 0, 23, 59, 59, 999);
        const ACTIVE = `('reserved','pending_payment','confirmed','checked_in','in_progress','rescheduled')`;
        if (rules.maxBookingsPerDay != null) {
            const [{ count }] = await this.ds.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE tenant_id = $1 AND user_id = $2
          AND starts_at BETWEEN $3 AND $4
          AND status IN ${ACTIVE} AND is_deleted = FALSE
      `, [tenantId, userId, startOfDay, endOfDay]);
            if (Number(count) >= rules.maxBookingsPerDay) {
                throw new common_1.BadRequestException(`You may not have more than ${rules.maxBookingsPerDay} booking(s) on the same day`);
            }
        }
        if (rules.maxBookingsPerWeek != null) {
            const [{ count }] = await this.ds.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE tenant_id = $1 AND user_id = $2
          AND starts_at BETWEEN $3 AND $4
          AND status IN ${ACTIVE} AND is_deleted = FALSE
      `, [tenantId, userId, monday, sunday]);
            if (Number(count) >= rules.maxBookingsPerWeek) {
                throw new common_1.BadRequestException(`You may not have more than ${rules.maxBookingsPerWeek} booking(s) in the same week`);
            }
        }
        if (rules.maxBookingsPerMonth != null) {
            const [{ count }] = await this.ds.query(`
        SELECT COUNT(*)::int AS count FROM bookings
        WHERE tenant_id = $1 AND user_id = $2
          AND starts_at BETWEEN $3 AND $4
          AND status IN ${ACTIVE} AND is_deleted = FALSE
      `, [tenantId, userId, startOfMonth, endOfMonth]);
            if (Number(count) >= rules.maxBookingsPerMonth) {
                throw new common_1.BadRequestException(`You may not have more than ${rules.maxBookingsPerMonth} booking(s) in the same month`);
            }
        }
    }
};
exports.BookingRulesService = BookingRulesService;
exports.BookingRulesService = BookingRulesService = BookingRulesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [booking_rules_repository_1.BookingRulesRepository,
        typeorm_2.DataSource])
], BookingRulesService);
//# sourceMappingURL=booking-rules.service.js.map