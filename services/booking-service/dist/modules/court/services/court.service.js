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
var CourtService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourtService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const court_repository_1 = require("../repositories/court.repository");
const venue_service_1 = require("../../venue/services/venue.service");
const court_events_1 = require("../events/court.events");
let CourtService = CourtService_1 = class CourtService {
    constructor(courtRepository, venueService, eventEmitter) {
        this.courtRepository = courtRepository;
        this.venueService = venueService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(CourtService_1.name);
    }
    async create(dto, tenantId) {
        await this.venueService.findOne(dto.venueId, tenantId);
        if (await this.courtRepository.isNameTaken(dto.name, dto.venueId, tenantId)) {
            throw new common_1.ConflictException(`A court named "${dto.name}" already exists in this venue`);
        }
        if (dto.courtNumber !== undefined) {
            if (await this.courtRepository.isCourtNumberTaken(dto.courtNumber, dto.venueId, tenantId)) {
                throw new common_1.ConflictException(`Court number ${dto.courtNumber} is already taken in this venue`);
            }
        }
        this.logger.log(`Creating court — venue: ${dto.venueId} tenant: ${tenantId}`);
        const entity = await this.courtRepository.create({
            ...dto,
            tenantId,
            currency: dto.currency ?? 'GBP',
            indoorOutdoor: dto.indoorOutdoor ?? 'indoor',
            slotDuration: dto.slotDuration ?? 60,
            bufferBefore: dto.bufferBefore ?? 0,
            bufferAfter: dto.bufferAfter ?? 0,
            displayOrder: dto.displayOrder ?? 0,
            isBookable: dto.isBookable ?? true,
            isActive: dto.isActive ?? true,
        });
        await this.eventEmitter.emitAsync(court_events_1.CourtEvents.CREATED, {
            tenantId,
            venueId: entity.venueId,
            courtId: entity.id,
        });
        return entity;
    }
    async findAll(tenantId) {
        return this.courtRepository.findAllByTenant(tenantId);
    }
    async findAllByVenue(venueId, tenantId) {
        await this.venueService.findOne(venueId, tenantId);
        return this.courtRepository.findAllByVenue(venueId, tenantId);
    }
    async findOne(id, tenantId) {
        const entity = await this.courtRepository.findByIdAndTenant(id, tenantId);
        if (!entity)
            throw new common_1.NotFoundException(`Court ${id} not found`);
        return entity;
    }
    async update(id, dto, tenantId) {
        const existing = await this.findOne(id, tenantId);
        if (dto.name !== undefined && dto.name !== existing.name) {
            if (await this.courtRepository.isNameTaken(dto.name, existing.venueId, tenantId, id)) {
                throw new common_1.ConflictException(`A court named "${dto.name}" already exists in this venue`);
            }
        }
        if (dto.courtNumber !== undefined && dto.courtNumber !== existing.courtNumber) {
            if (await this.courtRepository.isCourtNumberTaken(dto.courtNumber, existing.venueId, tenantId, id)) {
                throw new common_1.ConflictException(`Court number ${dto.courtNumber} is already taken in this venue`);
            }
        }
        const updated = await this.courtRepository.update(id, tenantId, dto);
        if (dto.isBookable !== undefined && dto.isBookable !== existing.isBookable) {
            await this.eventEmitter.emitAsync(court_events_1.CourtEvents.BOOKABILITY_CHANGED, {
                tenantId,
                venueId: existing.venueId,
                courtId: id,
                isBookable: dto.isBookable,
            });
        }
        await this.eventEmitter.emitAsync(court_events_1.CourtEvents.UPDATED, {
            tenantId,
            venueId: existing.venueId,
            courtId: id,
        });
        return updated;
    }
    async remove(id, tenantId) {
        const existing = await this.findOne(id, tenantId);
        await this.courtRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(court_events_1.CourtEvents.DELETED, {
            tenantId,
            venueId: existing.venueId,
            courtId: id,
        });
        this.logger.log(`Court ${id} soft-deleted — tenant: ${tenantId}`);
    }
};
exports.CourtService = CourtService;
exports.CourtService = CourtService = CourtService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [court_repository_1.CourtRepository,
        venue_service_1.VenueService,
        event_emitter_1.EventEmitter2])
], CourtService);
//# sourceMappingURL=court.service.js.map