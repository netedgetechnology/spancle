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
var CustomerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const customer_repository_1 = require("../repositories/customer.repository");
const customer_events_1 = require("../events/customer.events");
let CustomerService = CustomerService_1 = class CustomerService {
    constructor(customerRepository, eventEmitter) {
        this.customerRepository = customerRepository;
        this.eventEmitter = eventEmitter;
        this.logger = new common_1.Logger(CustomerService_1.name);
    }
    async create(dto, tenantId, actorId) {
        if (dto.email) {
            const existing = await this.customerRepository.findByEmailAndTenant(dto.email, tenantId);
            if (existing) {
                throw new common_1.BadRequestException(`A customer with email ${dto.email} already exists in this tenant`);
            }
        }
        const fullName = `${dto.firstName.trim()} ${dto.lastName.trim()}`;
        const entity = await this.customerRepository.create({
            tenantId,
            branchId: dto.branchId ?? null,
            userId: dto.userId ?? null,
            parentCustomerId: dto.parentCustomerId ?? null,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            fullName,
            gender: dto.gender ?? null,
            dateOfBirth: dto.dateOfBirth ?? null,
            phone: dto.phone ?? null,
            email: dto.email ?? null,
            emergencyContact: dto.emergencyContact ?? null,
            address: dto.address ?? null,
            profilePhoto: dto.profilePhoto ?? null,
            notes: dto.notes ?? null,
            isGuest: dto.isGuest ?? false,
            status: 'active',
            walletBalanceMinor: 0,
        });
        await this.eventEmitter.emitAsync(customer_events_1.CustomerEvents.CREATED, {
            tenantId, customerId: entity.id, actorId, timestamp: new Date().toISOString(),
        });
        this.logger.log(`Customer created — id=${entity.id} tenant=${tenantId}`);
        return entity;
    }
    async findAll(tenantId, query) {
        return this.customerRepository.search(tenantId, query);
    }
    async findOne(id, tenantId) {
        const entity = await this.customerRepository.findByIdAndTenant(id, tenantId);
        if (!entity)
            throw new common_1.NotFoundException(`Customer ${id} not found`);
        return entity;
    }
    async update(id, dto, tenantId, actorId) {
        const existing = await this.findOne(id, tenantId);
        const updates = { ...dto };
        const firstName = dto.firstName ?? existing.firstName;
        const lastName = dto.lastName ?? existing.lastName;
        if (dto.firstName || dto.lastName) {
            updates.fullName = `${firstName.trim()} ${lastName.trim()}`;
        }
        if (dto.email && dto.email !== existing.email) {
            const clash = await this.customerRepository.findByEmailAndTenant(dto.email, tenantId);
            if (clash && clash.id !== id) {
                throw new common_1.BadRequestException(`Email ${dto.email} is already used by another customer`);
            }
        }
        const updated = await this.customerRepository.update(id, tenantId, updates);
        if (dto.status && dto.status !== existing.status) {
            await this.eventEmitter.emitAsync(customer_events_1.CustomerEvents.STATUS_CHANGED, {
                tenantId, customerId: id, actorId,
                previousStatus: existing.status, newStatus: dto.status,
                timestamp: new Date().toISOString(),
            });
        }
        else {
            await this.eventEmitter.emitAsync(customer_events_1.CustomerEvents.UPDATED, {
                tenantId, customerId: id, actorId, timestamp: new Date().toISOString(),
            });
        }
        return updated;
    }
    async remove(id, tenantId, actorId) {
        await this.findOne(id, tenantId);
        await this.customerRepository.softDelete(id, tenantId);
        await this.eventEmitter.emitAsync(customer_events_1.CustomerEvents.DELETED, {
            tenantId, customerId: id, actorId, timestamp: new Date().toISOString(),
        });
        this.logger.log(`Customer soft-deleted — id=${id} tenant=${tenantId}`);
    }
    async getProfile(id, tenantId) {
        const profile = await this.customerRepository.getProfile(id, tenantId);
        if (!profile)
            throw new common_1.NotFoundException(`Customer ${id} not found`);
        return profile;
    }
    async resolveOrCreateForBooking(params) {
        try {
            const { tenantId, userId, email, name, phone, isGuest } = params;
            if (userId) {
                const byUser = await this.customerRepository.findByUserIdAndTenant(userId, tenantId);
                if (byUser)
                    return byUser.id;
            }
            if (email) {
                const byEmail = await this.customerRepository.findByEmailAndTenant(email, tenantId);
                if (byEmail)
                    return byEmail.id;
            }
            const nameParts = name.trim().split(' ');
            const firstName = nameParts[0] ?? name.trim();
            const lastName = nameParts.slice(1).join(' ') || '-';
            const created = await this.customerRepository.create({
                tenantId,
                userId: userId ?? null,
                firstName,
                lastName,
                fullName: name.trim(),
                email: email ?? null,
                phone: phone ?? null,
                isGuest,
                status: 'active',
                walletBalanceMinor: 0,
            });
            this.logger.log(`Auto-created customer — id=${created.id} isGuest=${isGuest} tenant=${tenantId}`);
            return created.id;
        }
        catch (err) {
            this.logger.warn(`resolveOrCreateForBooking failed — booking will have null customerId: ${err instanceof Error ? err.message : String(err)}`);
            return null;
        }
    }
};
exports.CustomerService = CustomerService;
exports.CustomerService = CustomerService = CustomerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [customer_repository_1.CustomerRepository,
        event_emitter_1.EventEmitter2])
], CustomerService);
//# sourceMappingURL=customer.service.js.map