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
var CourtService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourtService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const court_repository_1 = require("../repositories/court.repository");
const branch_service_1 = require("../../branch/services/branch.service");
const sport_service_1 = require("../../sport/services/sport.service");
const court_events_1 = require("../events/court.events");
const ALLOWED_TRANSITIONS = {
    available: ['unavailable', 'maintenance', 'retired'],
    unavailable: ['available', 'maintenance', 'retired'],
    maintenance: ['available', 'unavailable', 'retired'],
    retired: [],
};
let CourtService = CourtService_1 = class CourtService {
    constructor(courtRepository, branchService, sportService, eventEmitter) {
        this.courtRepository = courtRepository;
        this.branchService = branchService;
        this.sportService = sportService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(CourtService_1.name);
    }
    async create(dto, tenantId, actorId) {
        await this.assertBranchBelongsToTenant(dto.branchId, tenantId);
        if (dto.sportId) {
            await this.assertSportBelongsToTenant(dto.sportId, tenantId);
        }
        if (await this.courtRepository.isNameTakenInBranch(dto.name, dto.branchId, tenantId)) {
            throw new common_1.ConflictException(`A court named "${dto.name}" already exists in this branch`);
        }
        if (dto.operatingHours) {
            this.validateOperatingHours(dto.operatingHours);
        }
        const court = await this.courtRepository.insert({
            tenantId,
            branchId: dto.branchId,
            sportId: dto.sportId ?? null,
            name: dto.name,
            code: dto.code ?? null,
            description: dto.description ?? null,
            courtType: dto.courtType ?? 'indoor',
            surfaceType: dto.surfaceType ?? 'hard_court',
            capacity: dto.capacity ?? null,
            maxBookingsConcurrent: dto.maxBookingsConcurrent ?? 1,
            dimensions: dto.dimensions ?? null,
            status: dto.status ?? 'available',
            operatingHours: dto.operatingHours ?? null,
            courtNumber: dto.courtNumber ?? null,
            sortOrder: dto.sortOrder ?? 0,
            imageUrl: dto.imageUrl ?? null,
            amenities: dto.amenities ?? null,
            hourlyRateMinor: dto.hourlyRateMinor ?? null,
            maintenanceNote: null,
            maintenanceStartedAt: null,
            maintenanceExpectedEnd: null,
        }, tenantId);
        await this.emit(court_events_1.CourtEventNames.CREATED, {
            tenantId, courtId: court.id, branchId: court.branchId, actorId,
        });
        this.logger.log(`Court created: ${court.id} "${court.name}" branch=${court.branchId} tenant=${tenantId}`);
        return court;
    }
    async generateCourts(dto, tenantId, actorId) {
        await this.assertBranchBelongsToTenant(dto.branchId, tenantId);
        if (dto.sportId) {
            await this.assertSportBelongsToTenant(dto.sportId, tenantId);
        }
        if (dto.operatingHours) {
            this.validateOperatingHours(dto.operatingHours);
        }
        const existingNames = await this.courtRepository.getExistingNamesForBranch(dto.branchId, tenantId);
        const separator = dto.separator ?? ' ';
        const startNumber = dto.startNumber ?? 1;
        const currentCount = await this.courtRepository.countByBranch(dto.branchId, tenantId);
        const toCreate = [];
        let skipped = 0;
        for (let i = 0; i < dto.count; i++) {
            const num = startNumber + i;
            const name = `${dto.namePrefix}${separator}${num}`;
            if (existingNames.has(name.toLowerCase())) {
                skipped++;
                continue;
            }
            toCreate.push({
                name,
                courtNumber: num,
                sortOrder: currentCount + toCreate.length,
            });
        }
        if (toCreate.length === 0) {
            return { courts: [], created: 0, skipped };
        }
        const createdCourts = await this.courtRepository['entityManager'].transaction(async (manager) => {
            const { CourtEntity: CE } = await Promise.resolve().then(() => __importStar(require('../entities/court.entity')));
            const results = [];
            for (const item of toCreate) {
                const entity = manager.create(CE, {
                    tenantId,
                    branchId: dto.branchId,
                    sportId: dto.sportId ?? null,
                    name: item.name,
                    code: null,
                    description: null,
                    courtType: dto.courtType ?? 'indoor',
                    surfaceType: dto.surfaceType ?? 'hard_court',
                    capacity: dto.capacity ?? null,
                    maxBookingsConcurrent: 1,
                    dimensions: null,
                    status: 'available',
                    operatingHours: dto.operatingHours ?? null,
                    courtNumber: item.courtNumber,
                    sortOrder: item.sortOrder,
                    imageUrl: null,
                    amenities: null,
                    hourlyRateMinor: null,
                    maintenanceNote: null,
                    maintenanceStartedAt: null,
                    maintenanceExpectedEnd: null,
                    isDeleted: false,
                });
                results.push(await manager.save(CE, entity));
            }
            return results;
        });
        await this.eventEmitter.emitAsync(court_events_1.CourtEventNames.BULK_GENERATED, {
            tenantId,
            branchId: dto.branchId,
            courtIds: createdCourts.map((c) => c.id),
            count: createdCourts.length,
            skipped,
            actorId,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Bulk courts generated: created=${createdCourts.length} skipped=${skipped} ` +
            `branch=${dto.branchId} tenant=${tenantId}`);
        return { courts: createdCourts, created: createdCourts.length, skipped };
    }
    async findAll(tenantId, branchId, status) {
        if (branchId) {
            return this.courtRepository.findByBranch(branchId, tenantId, status);
        }
        if (status) {
            return this.courtRepository.findByStatus(status, tenantId);
        }
        return this.courtRepository.findAll(tenantId, {
            order: {
                branchId: 'ASC',
                courtNumber: 'ASC',
                sortOrder: 'ASC',
                name: 'ASC',
            },
        });
    }
    async findOne(id, tenantId) {
        return this.courtRepository.findByIdOrFail(id, tenantId);
    }
    async findByBranch(branchId, tenantId, status) {
        await this.assertBranchBelongsToTenant(branchId, tenantId);
        return this.courtRepository.findByBranch(branchId, tenantId, status);
    }
    async findBySport(sportId, tenantId, branchId) {
        return this.courtRepository.findBySport(sportId, tenantId, branchId);
    }
    async getStatusSummary(tenantId) {
        return this.courtRepository.countByStatus(tenantId);
    }
    async update(id, dto, tenantId, actorId) {
        const court = await this.courtRepository.findByIdOrFail(id, tenantId);
        if (dto.sportId !== undefined && dto.sportId !== null) {
            await this.assertSportBelongsToTenant(dto.sportId, tenantId);
        }
        if (dto.name && dto.name !== court.name) {
            if (await this.courtRepository.isNameTakenInBranch(dto.name, court.branchId, tenantId, id)) {
                throw new common_1.ConflictException(`A court named "${dto.name}" already exists in this branch`);
            }
        }
        if (dto.operatingHours) {
            this.validateOperatingHours(dto.operatingHours);
        }
        if ('status' in dto && dto.status && dto.status !== court.status) {
            throw new common_1.BadRequestException('Use PATCH /courts/:id/status to change court status');
        }
        const updated = await this.courtRepository.updateById(id, {
            ...(dto.sportId !== undefined && { sportId: dto.sportId }),
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.code !== undefined && { code: dto.code }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.courtType !== undefined && { courtType: dto.courtType }),
            ...(dto.surfaceType !== undefined && { surfaceType: dto.surfaceType }),
            ...(dto.capacity !== undefined && { capacity: dto.capacity }),
            ...(dto.maxBookingsConcurrent !== undefined && { maxBookingsConcurrent: dto.maxBookingsConcurrent }),
            ...(dto.dimensions !== undefined && { dimensions: dto.dimensions }),
            ...(dto.operatingHours !== undefined && { operatingHours: dto.operatingHours }),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
            ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
            ...(dto.amenities !== undefined && { amenities: dto.amenities }),
            ...(dto.hourlyRateMinor !== undefined && { hourlyRateMinor: dto.hourlyRateMinor }),
            ...(dto.rateCardId !== undefined && { rateCardId: dto.rateCardId }),
        }, tenantId);
        await this.emit(court_events_1.CourtEventNames.UPDATED, {
            tenantId, courtId: id, branchId: court.branchId, actorId,
        });
        return updated;
    }
    async updateStatus(id, dto, tenantId, actorId) {
        const court = await this.courtRepository.findByIdOrFail(id, tenantId);
        const allowed = ALLOWED_TRANSITIONS[court.status] ?? [];
        if (!allowed.includes(dto.status)) {
            throw new common_1.BadRequestException(`Cannot transition court from "${court.status}" to "${dto.status}". ` +
                `Allowed: [${allowed.join(', ') || 'none'}]`);
        }
        const clearMaintenance = court.status === 'maintenance' && dto.status !== 'maintenance';
        const previousStatus = court.status;
        await this.courtRepository.updateById(id, {
            status: dto.status,
            ...(clearMaintenance && {
                maintenanceNote: null,
                maintenanceStartedAt: null,
                maintenanceExpectedEnd: null,
            }),
        }, tenantId);
        const updated = await this.courtRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(court_events_1.CourtEventNames.STATUS_CHANGED, {
            tenantId, courtId: id, branchId: court.branchId, actorId,
            from: previousStatus, to: dto.status,
            timestamp: new Date().toISOString(),
        });
        if (clearMaintenance) {
            await this.eventEmitter.emitAsync(court_events_1.CourtEventNames.MAINTENANCE_RESOLVED, {
                tenantId, courtId: id, branchId: court.branchId, actorId,
                timestamp: new Date().toISOString(),
            });
        }
        this.logger.log(`Court status: ${id} ${previousStatus} → ${dto.status} tenant=${tenantId}`);
        return updated;
    }
    async setMaintenance(id, dto, tenantId, actorId) {
        const court = await this.courtRepository.findByIdOrFail(id, tenantId);
        if (court.status === 'retired') {
            throw new common_1.BadRequestException('A retired court cannot be placed in maintenance');
        }
        await this.courtRepository.updateById(id, {
            status: 'maintenance',
            maintenanceNote: dto.maintenanceNote,
            maintenanceStartedAt: new Date(),
            maintenanceExpectedEnd: dto.maintenanceExpectedEnd
                ? new Date(dto.maintenanceExpectedEnd)
                : null,
        }, tenantId);
        const updated = await this.courtRepository.findByIdOrFail(id, tenantId);
        await this.eventEmitter.emitAsync(court_events_1.CourtEventNames.MAINTENANCE_STARTED, {
            tenantId, courtId: id, branchId: court.branchId, actorId,
            maintenanceNote: dto.maintenanceNote,
            maintenanceExpectedEnd: dto.maintenanceExpectedEnd ?? null,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Court maintenance started: ${id} tenant=${tenantId} reason="${dto.maintenanceNote}"`);
        return updated;
    }
    async remove(id, tenantId, actorId) {
        const court = await this.courtRepository.findByIdOrFail(id, tenantId);
        if (court.status === 'available') {
            throw new common_1.BadRequestException('An available court cannot be deleted. Set it to unavailable or retired first.');
        }
        await this.courtRepository.softDelete(id, tenantId);
        await this.emit(court_events_1.CourtEventNames.DELETED, {
            tenantId, courtId: id, branchId: court.branchId, actorId,
        });
    }
    async assertBranchBelongsToTenant(branchId, tenantId) {
        try {
            await this.branchService.findOne(branchId, tenantId);
        }
        catch {
            throw new common_1.UnprocessableEntityException(`Branch ${branchId} not found in this organisation`);
        }
    }
    async assertSportBelongsToTenant(sportId, tenantId) {
        try {
            await this.sportService.findOne(sportId, tenantId);
        }
        catch {
            throw new common_1.UnprocessableEntityException(`Sport ${sportId} not found in this organisation`);
        }
    }
    validateOperatingHours(hours) {
        const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
        for (const day of DAYS) {
            const d = hours[day];
            if (!d)
                continue;
            if (typeof d.openTime === 'string' && !TIME_RE.test(d.openTime)) {
                throw new common_1.UnprocessableEntityException(`Invalid openTime for ${day}: "${d.openTime}" — must be HH:MM format`);
            }
            if (typeof d.closeTime === 'string' && !TIME_RE.test(d.closeTime)) {
                throw new common_1.UnprocessableEntityException(`Invalid closeTime for ${day}: "${d.closeTime}" — must be HH:MM format`);
            }
            if (!d.isClosed &&
                typeof d.openTime === 'string' &&
                typeof d.closeTime === 'string' &&
                d.openTime >= d.closeTime) {
                throw new common_1.UnprocessableEntityException(`Invalid hours for ${day}: openTime (${d.openTime}) must be before closeTime (${d.closeTime})`);
            }
        }
    }
    async emit(event, payload) {
        try {
            await this.eventEmitter.emitAsync(event, {
                ...payload,
                timestamp: new Date().toISOString(),
            });
        }
        catch (err) {
            this.logger.error(`Failed to emit ${event}: ${String(err)}`);
        }
    }
};
exports.CourtService = CourtService;
exports.CourtService = CourtService = CourtService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [court_repository_1.CourtRepository,
        branch_service_1.BranchService,
        sport_service_1.SportService,
        event_emitter_1.EventEmitter2])
], CourtService);
//# sourceMappingURL=court.service.js.map