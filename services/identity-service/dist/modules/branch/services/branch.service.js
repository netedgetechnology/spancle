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
var BranchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const branch_repository_1 = require("../repositories/branch.repository");
const user_repository_1 = require("../../user/repositories/user.repository");
const branch_events_1 = require("../events/branch.events");
const DEFAULT_TIMINGS = {
    monday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
    tuesday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
    wednesday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
    thursday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
    friday: { isClosed: false, openTime: '09:00', closeTime: '17:00' },
    saturday: { isClosed: true, openTime: '09:00', closeTime: '17:00' },
    sunday: { isClosed: true, openTime: '09:00', closeTime: '17:00' },
};
let BranchService = BranchService_1 = class BranchService {
    constructor(branchRepository, userRepository, eventEmitter) {
        this.branchRepository = branchRepository;
        this.userRepository = userRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(BranchService_1.name);
    }
    async create(dto, tenantId, actorId) {
        if (await this.branchRepository.isSlugTaken(dto.slug, tenantId)) {
            throw new common_1.ConflictException(`A branch with slug "${dto.slug}" already exists in this organisation`);
        }
        if (dto.managerUserId) {
            await this.assertManagerBelongsToTenant(dto.managerUserId, tenantId);
        }
        const timings = dto.timings ?? DEFAULT_TIMINGS;
        this.validateTimings(timings);
        const branch = await this.branchRepository.insert({
            tenantId,
            name: dto.name,
            slug: dto.slug,
            description: dto.description ?? null,
            addressLine1: dto.addressLine1,
            addressLine2: dto.addressLine2 ?? null,
            city: dto.city,
            county: dto.county ?? null,
            postcode: dto.postcode,
            countryCode: dto.countryCode ?? 'GB',
            latitude: dto.latitude ?? null,
            longitude: dto.longitude ?? null,
            geoLabel: dto.geoLabel ?? null,
            phone: dto.phone ?? null,
            email: dto.email ?? null,
            website: dto.website ?? null,
            managerUserId: dto.managerUserId ?? null,
            status: dto.status ?? 'active',
            timings,
            mapUrl: dto.mapUrl ?? null,
            facilities: dto.facilities ?? null,
            imageUrl: dto.imageUrl ?? null,
            sortOrder: dto.sortOrder ?? 0,
        }, tenantId);
        await this.emit(branch_events_1.BranchEventNames.CREATED, { tenantId, branchId: branch.id, actorId });
        this.logger.log(`Branch created: ${branch.id} slug="${branch.slug}" tenant=${tenantId}`);
        return branch;
    }
    async findAll(tenantId, status) {
        if (status) {
            return this.branchRepository.findByStatus(status, tenantId);
        }
        return this.branchRepository.findAll(tenantId);
    }
    async findOne(id, tenantId) {
        return this.branchRepository.findByIdOrFail(id, tenantId);
    }
    async findBySlug(slug, tenantId) {
        const branch = await this.branchRepository.findBySlug(slug, tenantId);
        if (!branch) {
            throw new common_1.NotFoundException(`Branch with slug "${slug}" not found`);
        }
        return branch;
    }
    async getStatusSummary(tenantId) {
        return this.branchRepository.countByStatus(tenantId);
    }
    async update(id, dto, tenantId, actorId) {
        await this.branchRepository.findByIdOrFail(id, tenantId);
        if (dto.timings) {
            this.validateTimings(dto.timings);
        }
        if (dto.managerUserId !== undefined && dto.managerUserId !== null) {
            await this.assertManagerBelongsToTenant(dto.managerUserId, tenantId);
        }
        const updated = await this.branchRepository.updateById(id, dto, tenantId);
        await this.emit(branch_events_1.BranchEventNames.UPDATED, { tenantId, branchId: id, actorId });
        return updated;
    }
    async assignManager(id, dto, tenantId, actorId) {
        const branch = await this.branchRepository.findByIdOrFail(id, tenantId);
        if (dto.managerUserId !== null && dto.managerUserId !== undefined) {
            await this.assertManagerBelongsToTenant(dto.managerUserId, tenantId);
        }
        const previousManagerUserId = branch.managerUserId;
        const updated = await this.branchRepository.updateById(id, { managerUserId: dto.managerUserId ?? null }, tenantId);
        const eventName = dto.managerUserId
            ? branch_events_1.BranchEventNames.MANAGER_ASSIGNED
            : branch_events_1.BranchEventNames.MANAGER_REMOVED;
        await this.eventEmitter.emitAsync(eventName, {
            tenantId,
            branchId: id,
            actorId,
            managerUserId: dto.managerUserId ?? null,
            previousManagerUserId,
            timestamp: new Date().toISOString(),
        });
        return updated;
    }
    async updateStatus(id, dto, tenantId, actorId) {
        const branch = await this.branchRepository.findByIdOrFail(id, tenantId);
        if (branch.status === 'archived' && dto.status !== 'archived') {
            throw new common_1.BadRequestException('An archived branch cannot be reactivated. Create a new branch instead.');
        }
        const previousStatus = branch.status;
        const updated = await this.branchRepository.updateById(id, { status: dto.status }, tenantId);
        await this.eventEmitter.emitAsync(branch_events_1.BranchEventNames.STATUS_CHANGED, {
            tenantId,
            branchId: id,
            actorId,
            from: previousStatus,
            to: dto.status,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Branch status: ${id} ${previousStatus} → ${dto.status} tenant=${tenantId}`);
        return updated;
    }
    async remove(id, tenantId, actorId) {
        const branch = await this.branchRepository.findByIdOrFail(id, tenantId);
        if (branch.status === 'active') {
            throw new common_1.BadRequestException('An active branch cannot be deleted. Set it to inactive or archived first.');
        }
        await this.branchRepository.softDelete(id, tenantId);
        await this.emit(branch_events_1.BranchEventNames.DELETED, { tenantId, branchId: id, actorId });
    }
    async assertManagerBelongsToTenant(managerUserId, tenantId) {
        const user = await this.userRepository.findByIdAndTenant(managerUserId, tenantId);
        if (!user) {
            throw new common_1.UnprocessableEntityException(`User ${managerUserId} not found in this organisation. ` +
                'Manager must be an existing user in the same organisation.');
        }
    }
    validateTimings(timings) {
        const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        for (const day of DAYS) {
            const t = timings[day];
            if (!t || t.isClosed)
                continue;
            if (t.openTime >= t.closeTime) {
                throw new common_1.UnprocessableEntityException(`Invalid timings for ${day}: openTime (${t.openTime}) must be before closeTime (${t.closeTime})`);
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
exports.BranchService = BranchService;
exports.BranchService = BranchService = BranchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [branch_repository_1.BranchRepository,
        user_repository_1.UserRepository,
        event_emitter_1.EventEmitter2])
], BranchService);
//# sourceMappingURL=branch.service.js.map