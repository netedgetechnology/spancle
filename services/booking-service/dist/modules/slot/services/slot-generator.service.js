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
var SlotGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const typeorm_1 = require("typeorm");
const slot_repository_1 = require("../repositories/slot.repository");
const slot_template_repository_1 = require("../repositories/slot-template.repository");
const blackout_repository_1 = require("../repositories/blackout.repository");
const holiday_repository_1 = require("../repositories/holiday.repository");
const pricing_service_1 = require("./pricing.service");
const slot_utils_1 = require("../utils/slot.utils");
const court_repository_1 = require("../../court/repositories/court.repository");
const venue_service_1 = require("../../venue/services/venue.service");
const slot_entity_1 = require("../entities/slot.entity");
const slot_events_1 = require("../events/slot.events");
let SlotGeneratorService = SlotGeneratorService_1 = class SlotGeneratorService {
    constructor(slotRepository, slotTemplateRepository, blackoutRepository, holidayRepository, pricingService, eventEmitter, courtRepository, venueService, dataSource) {
        this.slotRepository = slotRepository;
        this.slotTemplateRepository = slotTemplateRepository;
        this.blackoutRepository = blackoutRepository;
        this.holidayRepository = holidayRepository;
        this.pricingService = pricingService;
        this.eventEmitter = eventEmitter;
        this.courtRepository = courtRepository;
        this.venueService = venueService;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(SlotGeneratorService_1.name);
    }
    async generate(dto, tenantId, actorId) {
        const court = await this.fetchCourtOrFail(dto.courtId, tenantId);
        this.assertCourtBookable(court);
        const config = dto.templateId
            ? await this.resolveFromTemplate(dto.templateId, tenantId)
            : {
                durationMins: dto.durationMins ?? court.slotDuration,
                bufferMins: dto.bufferMins ?? (court.bufferBefore + court.bufferAfter),
                autoPublish: dto.autoPublish ?? true,
                skipHolidays: dto.skipHolidays ?? false,
                skipBlackouts: dto.skipBlackouts ?? true,
                hoursOverride: dto.hoursOverride ?? null,
            };
        const today = slot_utils_1.SlotUtils.todayUtc();
        const maxEnd = slot_utils_1.SlotUtils.addDays(today, 180);
        if (dto.startDate < today) {
            throw new common_1.BadRequestException('startDate cannot be in the past');
        }
        if (dto.endDate < dto.startDate) {
            throw new common_1.BadRequestException('endDate must be on or after startDate');
        }
        if (dto.endDate > maxEnd) {
            throw new common_1.BadRequestException('Cannot generate slots more than 180 days in advance');
        }
        const startDateObj = new Date(`${dto.startDate}T00:00:00.000Z`);
        const endDateObj = new Date(`${dto.endDate}T23:59:59.000Z`);
        const [blackouts, holidayDates] = await Promise.all([
            config.skipBlackouts
                ? this.blackoutRepository.findOverlapping({
                    tenantId,
                    courtId: dto.courtId,
                    branchId: court.branchId,
                    sportId: court.sportId ?? undefined,
                    startAt: startDateObj,
                    endAt: endDateObj,
                })
                : Promise.resolve([]),
            config.skipHolidays
                ? this.holidayRepository.getHolidayDatesInRange(tenantId, dto.startDate, dto.endDate)
                : Promise.resolve(new Set()),
        ]);
        const existingSlots = await this.slotRepository.findInRange({
            tenantId,
            courtId: dto.courtId,
            startAt: startDateObj,
            endAt: endDateObj,
        });
        const existingRanges = existingSlots.map((s) => ({
            startAt: s.startAt,
            endAt: s.endAt,
        }));
        const toInsert = [];
        const skipReasons = {};
        let skippedCount = 0;
        const skip = (reason) => {
            skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
            skippedCount++;
        };
        for (const dateStr of slot_utils_1.SlotUtils.iterateDates(dto.startDate, dto.endDate)) {
            const dayOfWeek = slot_utils_1.SlotUtils.getDayOfWeek(new Date(`${dateStr}T00:00:00.000Z`));
            const hours = this.resolveHoursForDay(court, dayOfWeek, config.hoursOverride);
            if (!hours) {
                skip('court_closed');
                continue;
            }
            if (config.skipHolidays && holidayDates.has(dateStr)) {
                skip('holiday');
                continue;
            }
            const timeSlots = this.generateSlotsForDay(dateStr, hours, config.durationMins, config.bufferMins);
            for (const ts of timeSlots) {
                const isBlackedOut = blackouts.some((b) => slot_utils_1.SlotUtils.overlaps(ts.startAt, ts.endAt, b.startAt, b.endAt));
                if (isBlackedOut) {
                    skip('blackout');
                    continue;
                }
                const hasOverlap = existingRanges.some((r) => slot_utils_1.SlotUtils.overlaps(ts.startAt, ts.endAt, r.startAt, r.endAt));
                if (hasOverlap) {
                    skip('overlap');
                    continue;
                }
                existingRanges.push({ startAt: ts.startAt, endAt: ts.endAt });
                toInsert.push({
                    tenantId,
                    courtId: dto.courtId,
                    venueId: court.venueId,
                    branchId: court.branchId,
                    sportId: court.sportId,
                    startAt: ts.startAt,
                    endAt: ts.endAt,
                    durationMins: config.durationMins,
                    status: config.autoPublish ? 'available' : 'unavailable',
                    currency: 'GBP',
                    maxBookings: 1,
                    currentBookings: 0,
                    label: slot_utils_1.SlotUtils.buildLabel(court.name, ts.startAt, ts.endAt),
                    templateId: dto.templateId ?? null,
                });
            }
        }
        if (toInsert.length === 0) {
            this.logger.log(`Slot generation: 0 slots created (${skippedCount} skipped) ` +
                `court=${dto.courtId} tenant=${tenantId}`);
            return { created: 0, skipped: skippedCount, reasons: skipReasons, slotIds: [] };
        }
        const priceResults = await this.pricingService.resolveBatch(toInsert.map((s) => ({
            tenantId,
            courtId: dto.courtId,
            branchId: court.branchId,
            sportId: court.sportId ?? null,
            startAt: s.startAt,
            durationMins: config.durationMins,
            courtHourlyRateMinor: court.hourlyPrice ?? null,
            isMember: false,
            currency: 'GBP',
        })));
        for (let i = 0; i < toInsert.length; i++) {
            const p = priceResults[i];
            toInsert[i].resolvedPriceMinor = p.resolvedPriceMinor;
            toInsert[i].appliedRuleIds = p.appliedRuleIds;
        }
        const created = await this.dataSource.transaction(async (manager) => {
            const entities = toInsert.map((d) => manager.create(slot_entity_1.SlotEntity, d));
            return manager.save(slot_entity_1.SlotEntity, entities);
        });
        const slotIds = created.map((s) => s.id);
        await this.eventEmitter.emitAsync(slot_events_1.SlotEvents.BULK_GENERATED, {
            tenantId,
            courtId: dto.courtId,
            venueId: court.venueId,
            branchId: court.branchId,
            count: created.length,
            slotIds,
            actorId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Slot generation: created=${created.length} skipped=${skippedCount} ` +
            `court=${dto.courtId} tenant=${tenantId}`);
        return {
            created: created.length,
            skipped: skippedCount,
            reasons: skipReasons,
            slotIds,
        };
    }
    async fetchCourtOrFail(courtId, tenantId) {
        const court = await this.courtRepository.findByIdAndTenant(courtId, tenantId);
        if (!court) {
            throw new common_1.UnprocessableEntityException(`Court ${courtId} not found for this organisation`);
        }
        return court;
    }
    assertCourtBookable(court) {
        if (court.isDeleted) {
            throw new common_1.BadRequestException('Court has been deleted and cannot accept new slots');
        }
        if (!court.isActive) {
            throw new common_1.BadRequestException('Court is inactive and cannot accept new slots');
        }
        if (!court.isBookable) {
            throw new common_1.BadRequestException('Court is not bookable and cannot accept new slots');
        }
    }
    async resolveFromTemplate(templateId, tenantId) {
        const template = await this.slotTemplateRepository.findByIdOrFail(templateId, tenantId);
        return {
            durationMins: template.durationMins,
            bufferMins: template.bufferMins,
            autoPublish: template.autoPublish,
            skipHolidays: false,
            skipBlackouts: true,
            hoursOverride: template.openTime && template.closeTime
                ? { openTime: template.openTime, closeTime: template.closeTime }
                : null,
        };
    }
    resolveHoursForDay(_court, _dayOfWeek, hoursOverride) {
        if (hoursOverride) {
            return { openTime: hoursOverride.openTime, closeTime: hoursOverride.closeTime };
        }
        return { openTime: '06:00', closeTime: '23:00' };
    }
    generateSlotsForDay(dateStr, hours, durationMins, bufferMins) {
        return slot_utils_1.SlotUtils.chopIntoSlots(dateStr, hours.openTime, hours.closeTime, durationMins, bufferMins);
    }
};
exports.SlotGeneratorService = SlotGeneratorService;
exports.SlotGeneratorService = SlotGeneratorService = SlotGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [slot_repository_1.SlotRepository,
        slot_template_repository_1.SlotTemplateRepository,
        blackout_repository_1.BlackoutRepository,
        holiday_repository_1.HolidayRepository,
        pricing_service_1.PricingService,
        event_emitter_1.EventEmitter2,
        court_repository_1.CourtRepository,
        venue_service_1.VenueService,
        typeorm_1.DataSource])
], SlotGeneratorService);
//# sourceMappingURL=slot-generator.service.js.map