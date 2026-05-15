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
var SportService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SportService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const sport_repository_1 = require("../repositories/sport.repository");
const sport_branch_repository_1 = require("../repositories/sport-branch.repository");
const branch_service_1 = require("../../branch/services/branch.service");
const sport_events_1 = require("../events/sport.events");
let SportService = SportService_1 = class SportService {
    constructor(sportRepository, sportBranchRepository, branchService, eventEmitter) {
        this.sportRepository = sportRepository;
        this.sportBranchRepository = sportBranchRepository;
        this.branchService = branchService;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(SportService_1.name);
    }
    async create(dto, tenantId, actorId) {
        if (await this.sportRepository.isSlugTaken(dto.slug, tenantId)) {
            throw new common_1.ConflictException(`A sport with slug "${dto.slug}" already exists in this organisation`);
        }
        if (dto.branchIds && dto.branchIds.length > 0) {
            await this.assertBranchesBelongToTenant(dto.branchIds, tenantId);
        }
        const sport = await this.sportRepository.insert({
            tenantId,
            name: dto.name,
            slug: dto.slug,
            description: dto.description ?? null,
            icon: dto.icon ?? null,
            color: dto.color ?? null,
            config: dto.config ?? {},
            status: dto.status ?? 'active',
            sortOrder: dto.sortOrder ?? 0,
        }, tenantId);
        if (dto.branchIds && dto.branchIds.length > 0) {
            await this.sportBranchRepository.replaceBranchMappings(sport.id, dto.branchIds, tenantId);
        }
        await this.emit(sport_events_1.SportEventNames.CREATED, { tenantId, sportId: sport.id, actorId });
        this.logger.log(`Sport created: ${sport.id} slug="${sport.slug}" tenant=${tenantId}`);
        return this.withBranches(sport, tenantId);
    }
    async findAll(tenantId, status) {
        const sports = status
            ? await this.sportRepository.findByStatus(status, tenantId)
            : await this.sportRepository.findAll(tenantId, {
                order: { sortOrder: 'ASC', name: 'ASC' },
            });
        return Promise.all(sports.map((s) => this.withBranches(s, tenantId)));
    }
    async findOne(id, tenantId) {
        const sport = await this.sportRepository.findByIdOrFail(id, tenantId);
        return this.withBranches(sport, tenantId);
    }
    async findBySlug(slug, tenantId) {
        const sport = await this.sportRepository.findBySlug(slug, tenantId);
        if (!sport)
            throw new common_1.NotFoundException(`Sport with slug "${slug}" not found`);
        return this.withBranches(sport, tenantId);
    }
    async findByBranch(branchId, tenantId) {
        const sports = await this.sportRepository.findByBranch(branchId, tenantId);
        return Promise.all(sports.map((s) => this.withBranches(s, tenantId)));
    }
    async getStatusSummary(tenantId) {
        return this.sportRepository.countByStatus(tenantId);
    }
    async update(id, dto, tenantId, actorId) {
        await this.sportRepository.findByIdOrFail(id, tenantId);
        let mergedConfig;
        if (dto.config !== undefined) {
            const current = await this.sportRepository.findByIdOrFail(id, tenantId);
            mergedConfig = { ...current.config, ...dto.config };
        }
        const updated = await this.sportRepository.updateById(id, {
            ...(dto.name !== undefined && { name: dto.name }),
            ...(dto.description !== undefined && { description: dto.description }),
            ...(dto.icon !== undefined && { icon: dto.icon }),
            ...(dto.color !== undefined && { color: dto.color }),
            ...(mergedConfig !== undefined && { config: mergedConfig }),
            ...(dto.status !== undefined && { status: dto.status }),
            ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        }, tenantId);
        await this.emit(sport_events_1.SportEventNames.UPDATED, { tenantId, sportId: id, actorId });
        return this.withBranches(updated, tenantId);
    }
    async updateStatus(id, dto, tenantId, actorId) {
        const sport = await this.sportRepository.findByIdOrFail(id, tenantId);
        const from = sport.status;
        const updated = await this.sportRepository.updateById(id, { status: dto.status }, tenantId);
        await this.eventEmitter.emitAsync(sport_events_1.SportEventNames.STATUS_CHANGED, {
            tenantId,
            sportId: id,
            actorId,
            from,
            to: dto.status,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Sport status: ${id} ${from} → ${dto.status} tenant=${tenantId}`);
        return this.withBranches(updated, tenantId);
    }
    async assignBranches(sportId, dto, tenantId, actorId) {
        await this.sportRepository.findByIdOrFail(sportId, tenantId);
        const previousBranchIds = await this.sportBranchRepository.getBranchIdsForSport(sportId, tenantId);
        if (dto.branchIds.length > 0) {
            await this.assertBranchesBelongToTenant(dto.branchIds, tenantId);
        }
        await this.sportBranchRepository.replaceBranchMappings(sportId, dto.branchIds, tenantId);
        await this.eventEmitter.emitAsync(sport_events_1.SportEventNames.BRANCHES_ASSIGNED, {
            tenantId,
            sportId,
            actorId,
            branchIds: dto.branchIds,
            previousBranchIds,
            timestamp: new Date().toISOString(),
        });
        this.logger.log(`Sport branches assigned: sport=${sportId} branches=[${dto.branchIds.join(',')}] tenant=${tenantId}`);
        return this.findOne(sportId, tenantId);
    }
    async remove(id, tenantId, actorId) {
        const sport = await this.sportRepository.findByIdOrFail(id, tenantId);
        if (sport.status === 'active') {
            throw new common_1.BadRequestException('An active sport cannot be deleted. Set it to inactive first.');
        }
        await this.sportBranchRepository.deleteAllForSport(id, tenantId);
        await this.sportRepository.softDelete(id, tenantId);
        await this.emit(sport_events_1.SportEventNames.DELETED, { tenantId, sportId: id, actorId });
        this.logger.log(`Sport deleted: ${id} tenant=${tenantId}`);
    }
    async assertBranchesBelongToTenant(branchIds, tenantId) {
        for (const branchId of branchIds) {
            let branch;
            try {
                branch = await this.branchService.findOne(branchId, tenantId);
            }
            catch {
                throw new common_1.UnprocessableEntityException(`Branch ${branchId} not found in this organisation`);
            }
            if (branch.status === 'archived') {
                throw new common_1.UnprocessableEntityException(`Branch "${branch.name}" is archived and cannot be assigned to a sport`);
            }
        }
    }
    async withBranches(sport, tenantId) {
        const branchIds = await this.sportBranchRepository.getBranchIdsForSport(sport.id, tenantId);
        return { ...sport, branchIds };
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
exports.SportService = SportService;
exports.SportService = SportService = SportService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [sport_repository_1.SportRepository,
        sport_branch_repository_1.SportBranchRepository,
        branch_service_1.BranchService,
        event_emitter_1.EventEmitter2])
], SportService);
//# sourceMappingURL=sport.service.js.map