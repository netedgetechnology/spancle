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
var HolidayService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HolidayService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const holiday_repository_1 = require("../repositories/holiday.repository");
const UK_SYSTEM_HOLIDAYS = [
    { name: "New Year's Day", date: '2000-01-01', isRecurring: true, countryCode: 'GB', source: 'system' },
    { name: 'Good Friday', date: '2000-04-07', isRecurring: false, countryCode: 'GB', source: 'system' },
    { name: 'Easter Monday', date: '2000-04-10', isRecurring: false, countryCode: 'GB', source: 'system' },
    { name: 'Early May Bank Holiday', date: '2000-05-01', isRecurring: false, countryCode: 'GB', source: 'system' },
    { name: 'Spring Bank Holiday', date: '2000-05-29', isRecurring: false, countryCode: 'GB', source: 'system' },
    { name: 'Summer Bank Holiday', date: '2000-08-28', isRecurring: false, countryCode: 'GB', source: 'system' },
    { name: 'Christmas Day', date: '2000-12-25', isRecurring: true, countryCode: 'GB', source: 'system' },
    { name: 'Boxing Day', date: '2000-12-26', isRecurring: true, countryCode: 'GB', source: 'system' },
];
let HolidayService = HolidayService_1 = class HolidayService {
    constructor(holidayRepository, eventEmitter) {
        this.holidayRepository = holidayRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(HolidayService_1.name);
    }
    async create(dto, tenantId, actorId) {
        if (!dto.name?.trim())
            throw new common_1.BadRequestException('Holiday name is required');
        if (!dto.date)
            throw new common_1.BadRequestException('Holiday date is required');
        const existing = await this.holidayRepository.existsByDate(tenantId, dto.date, 'tenant');
        if (existing) {
            throw new common_1.ConflictException(`A custom holiday already exists on ${dto.date}. ` +
                'Update the existing record instead.');
        }
        const holiday = await this.holidayRepository.create({
            tenantId,
            name: dto.name.trim(),
            date: dto.date,
            isRecurring: dto.isRecurring ?? false,
            source: 'tenant',
            countryCode: dto.countryCode ?? null,
            description: dto.description ?? null,
            isActive: true,
            isDeleted: false,
        });
        await this.eventEmitter.emitAsync('spancle.holiday.created', {
            tenantId, holidayId: holiday.id, actorId, timestamp: new Date().toISOString(),
        });
        return holiday;
    }
    async findAll(tenantId) {
        return this.holidayRepository.findAll(tenantId);
    }
    async findOne(id, tenantId) {
        const h = await this.holidayRepository.findById(id, tenantId);
        if (!h)
            throw new common_1.NotFoundException(`Holiday ${id} not found`);
        return h;
    }
    async update(id, dto, tenantId, actorId) {
        const existing = await this.findOne(id, tenantId);
        if (existing.source === 'system') {
            throw new common_1.BadRequestException('System holidays cannot be edited. Create a tenant override with the same date.');
        }
        const updated = await this.holidayRepository.updateById(id, tenantId, {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.date !== undefined && { date: dto.date }),
            ...(dto.isRecurring !== undefined && { isRecurring: dto.isRecurring }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        });
        await this.eventEmitter.emitAsync('spancle.holiday.updated', {
            tenantId, holidayId: id, actorId, timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async remove(id, tenantId, actorId) {
        const existing = await this.findOne(id, tenantId);
        if (existing.source === 'system') {
            throw new common_1.BadRequestException('System holidays cannot be deleted. Deactivate them with isActive: false instead.');
        }
        await this.holidayRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync('spancle.holiday.deleted', {
            tenantId, holidayId: id, actorId, timestamp: new Date().toISOString(),
        });
    }
    async seedSystemHolidays(tenantId, actorId) {
        let seeded = 0;
        let skipped = 0;
        for (const holiday of UK_SYSTEM_HOLIDAYS) {
            const exists = await this.holidayRepository.existsByDate(tenantId, holiday.date, 'system');
            if (exists) {
                skipped++;
                continue;
            }
            await this.holidayRepository.create({
                tenantId,
                name: holiday.name,
                date: holiday.date,
                isRecurring: holiday.isRecurring ?? false,
                source: 'system',
                countryCode: holiday.countryCode ?? 'GB',
                description: null,
                isActive: true,
                isDeleted: false,
            });
            seeded++;
        }
        this.logger.log(`Holiday seed: seeded=${seeded} skipped=${skipped} tenant=${tenantId}`);
        return { seeded, skipped };
    }
    async isHoliday(tenantId, date) {
        const result = await this.holidayRepository.isHoliday(tenantId, date);
        return { isHoliday: result };
    }
};
exports.HolidayService = HolidayService;
exports.HolidayService = HolidayService = HolidayService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [holiday_repository_1.HolidayRepository,
        event_emitter_1.EventEmitter2])
], HolidayService);
//# sourceMappingURL=holiday.service.js.map