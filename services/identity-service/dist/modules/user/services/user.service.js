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
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const user_repository_1 = require("../repositories/user.repository");
const user_events_1 = require("../events/user.events");
let UserService = UserService_1 = class UserService {
    constructor(userRepository, eventEmitter) {
        this.userRepository = userRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(UserService_1.name);
    }
    async create(dto, tenantId) {
        this.logger.log(`Creating user -- tenant: ${tenantId}`);
        const entity = await this.userRepository.create({ ...dto, tenantId });
        await this.eventEmitter.emitAsync(user_events_1.UserEvents.CREATED, { tenantId, userId: entity.id });
        return entity;
    }
    async findAll(tenantId) {
        return this.userRepository.findAllByTenant(tenantId);
    }
    async findOne(id, tenantId) {
        const entity = await this.userRepository.findByIdAndTenant(id, tenantId);
        if (!entity)
            throw new common_1.NotFoundException('User not found');
        return entity;
    }
    async update(id, dto, tenantId) {
        await this.findOne(id, tenantId);
        const updated = await this.userRepository.update(id, tenantId, dto);
        await this.eventEmitter.emitAsync(user_events_1.UserEvents.UPDATED, { tenantId, userId: id });
        return updated;
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        await this.userRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(user_events_1.UserEvents.DELETED, { tenantId, userId: id });
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        event_emitter_1.EventEmitter2])
], UserService);
//# sourceMappingURL=user.service.js.map