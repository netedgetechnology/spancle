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
var RateCardService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateCardService = void 0;
const common_1 = require("@nestjs/common");
const rate_card_repository_1 = require("../repositories/rate-card.repository");
let RateCardService = RateCardService_1 = class RateCardService {
    constructor(rateCardRepository) {
        this.rateCardRepository = rateCardRepository;
        this.logger = new common_1.Logger(RateCardService_1.name);
    }
    async create(dto, tenantId, actorId) {
        if (dto.dateOverrides?.length) {
            this.validateDateOverrides(dto.dateOverrides);
        }
        const card = await this.rateCardRepository.insert({
            tenantId,
            name: dto.name,
            description: dto.description ?? null,
            currency: dto.currency ?? 'GBP',
            defaultPriceMinor: dto.defaultPriceMinor ?? null,
            weeklyGrid: dto.weeklyGrid ?? {},
            dateOverrides: dto.dateOverrides ?? [],
            isActive: dto.isActive ?? true,
        });
        this.logger.log(`Rate card created: ${card.id} tenant=${tenantId} actor=${actorId}`);
        return card;
    }
    async findAll(tenantId, opts) {
        return this.rateCardRepository.findAll(tenantId, {
            isActive: opts.isActive,
            page: opts.page ?? 1,
            limit: opts.limit ?? 25,
        });
    }
    async findById(id, tenantId) {
        return this.rateCardRepository.findByIdOrFail(id, tenantId);
    }
    async update(id, dto, tenantId, actorId) {
        await this.rateCardRepository.findByIdOrFail(id, tenantId);
        if (dto.dateOverrides?.length) {
            this.validateDateOverrides(dto.dateOverrides);
        }
        const updates = {};
        if (dto.name !== undefined)
            updates.name = dto.name;
        if (dto.description !== undefined)
            updates.description = dto.description ?? null;
        if (dto.currency !== undefined)
            updates.currency = dto.currency;
        if (dto.defaultPriceMinor !== undefined)
            updates.defaultPriceMinor = dto.defaultPriceMinor ?? null;
        if (dto.weeklyGrid !== undefined)
            updates.weeklyGrid = dto.weeklyGrid;
        if (dto.dateOverrides !== undefined)
            updates.dateOverrides = dto.dateOverrides;
        if (dto.isActive !== undefined)
            updates.isActive = dto.isActive;
        const updated = await this.rateCardRepository.update(id, tenantId, updates);
        this.logger.log(`Rate card updated: ${id} tenant=${tenantId} actor=${actorId}`);
        return updated;
    }
    async activate(id, tenantId, actorId) {
        await this.rateCardRepository.findByIdOrFail(id, tenantId);
        const card = await this.rateCardRepository.update(id, tenantId, { isActive: true });
        this.logger.log(`Rate card activated: ${id} actor=${actorId}`);
        return card;
    }
    async deactivate(id, tenantId, actorId) {
        await this.rateCardRepository.findByIdOrFail(id, tenantId);
        const card = await this.rateCardRepository.update(id, tenantId, { isActive: false });
        this.logger.log(`Rate card deactivated: ${id} actor=${actorId}`);
        return card;
    }
    async remove(id, tenantId, actorId) {
        await this.rateCardRepository.findByIdOrFail(id, tenantId);
        await this.rateCardRepository.softDelete(id, tenantId);
        this.logger.log(`Rate card soft-deleted: ${id} actor=${actorId}`);
    }
    resolveBasePrice(card, date, dayName, hour) {
        const override = card.dateOverrides.find((o) => o.date === date);
        if (override) {
            if (override.allDay && override.priceMinor !== undefined) {
                return override.priceMinor;
            }
            if (!override.allDay && override.hourlySlots) {
                const slot = override.hourlySlots.find((s) => s.hour === hour);
                if (slot !== undefined)
                    return slot.priceMinor;
            }
        }
        const dayGrid = card.weeklyGrid[dayName];
        if (dayGrid?.hourlySlots) {
            const slot = dayGrid.hourlySlots.find((s) => s.hour === hour);
            if (slot !== undefined)
                return slot.priceMinor;
        }
        return card.defaultPriceMinor ?? null;
    }
    validateDateOverrides(overrides) {
        const seen = new Set();
        for (const override of overrides) {
            if (seen.has(override.date)) {
                throw new common_1.ConflictException(`Duplicate date override for ${override.date} — only one override per date is allowed`);
            }
            seen.add(override.date);
            if (override.allDay && override.priceMinor === undefined) {
                throw new common_1.BadRequestException(`Date override for ${override.date}: priceMinor is required when allDay = true`);
            }
            if (!override.allDay && (!override.hourlySlots || override.hourlySlots.length === 0)) {
                throw new common_1.BadRequestException(`Date override for ${override.date}: hourlySlots is required when allDay = false`);
            }
            if (override.hourlySlots) {
                const hours = override.hourlySlots.map((s) => s.hour);
                if (new Set(hours).size !== hours.length) {
                    throw new common_1.BadRequestException(`Date override for ${override.date}: duplicate hour entries`);
                }
            }
        }
    }
};
exports.RateCardService = RateCardService;
exports.RateCardService = RateCardService = RateCardService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [rate_card_repository_1.RateCardRepository])
], RateCardService);
//# sourceMappingURL=rate-card.service.js.map