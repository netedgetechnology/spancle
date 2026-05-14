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
var TenantService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const tenant_repository_1 = require("../repositories/tenant.repository");
const tenant_events_1 = require("../events/tenant.events");
let TenantService = TenantService_1 = class TenantService {
    constructor(tenantRepository, eventEmitter) {
        this.tenantRepository = tenantRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(TenantService_1.name);
    }
    async create(dto, tenantId) {
        this.logger.log(`Creating tenant -- tenant: ${tenantId}`);
        const entity = await this.tenantRepository.create({ ...dto, tenantId });
        await this.eventEmitter.emitAsync(tenant_events_1.TenantEvents.CREATED, { tenantId: entity.id });
        return entity;
    }
    async findAll(tenantId) {
        return this.tenantRepository.findAllByTenant(tenantId);
    }
    async findOne(id, tenantId) {
        const entity = await this.tenantRepository.findByIdAndTenant(id, tenantId);
        if (!entity)
            throw new common_1.NotFoundException('Tenant not found');
        return entity;
    }
    async update(id, dto, tenantId) {
        await this.findOne(id, tenantId);
        const updated = await this.tenantRepository.update(id, tenantId, dto);
        await this.eventEmitter.emitAsync(tenant_events_1.TenantEvents.UPDATED, { tenantId: id });
        return updated;
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.tenantRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(tenant_events_1.TenantEvents.DELETED, { tenantId: id });
    }
};
exports.TenantService = TenantService;
exports.TenantService = TenantService = TenantService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tenant_repository_1.TenantRepository,
        event_emitter_1.EventEmitter2])
], TenantService);
//# sourceMappingURL=tenant.service.js.map