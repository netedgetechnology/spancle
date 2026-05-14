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
var RoleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const role_repository_1 = require("../repositories/role.repository");
const role_events_1 = require("../events/role.events");
let RoleService = RoleService_1 = class RoleService {
    constructor(roleRepository, eventEmitter) {
        this.roleRepository = roleRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(RoleService_1.name);
    }
    async create(dto, tenantId) {
        this.logger.log(`Creating role -- tenant: ${tenantId}`);
        const entity = await this.roleRepository.create({ ...dto, tenantId });
        await this.eventEmitter.emitAsync(role_events_1.RoleEvents.CREATED, { tenantId, roleId: entity.id });
        return entity;
    }
    async findAll(tenantId) {
        return this.roleRepository.findAllByTenant(tenantId);
    }
    async findOne(id, tenantId) {
        const entity = await this.roleRepository.findByIdAndTenant(id, tenantId);
        if (!entity)
            throw new common_1.NotFoundException('Role not found');
        return entity;
    }
    async update(id, dto, tenantId) {
        await this.findOne(id, tenantId);
        const updated = await this.roleRepository.update(id, tenantId, dto);
        await this.eventEmitter.emitAsync(role_events_1.RoleEvents.UPDATED, { tenantId, roleId: id });
        return updated;
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.roleRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(role_events_1.RoleEvents.DELETED, { tenantId, roleId: id });
    }
};
exports.RoleService = RoleService;
exports.RoleService = RoleService = RoleService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [role_repository_1.RoleRepository,
        event_emitter_1.EventEmitter2])
], RoleService);
//# sourceMappingURL=role.service.js.map