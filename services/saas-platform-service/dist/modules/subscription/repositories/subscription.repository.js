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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const subscription_entity_1 = require("../entities/subscription.entity");
let SubscriptionRepository = class SubscriptionRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        const entity = this.repo.create(data);
        return this.repo.save(entity);
    }
    async findById(id) {
        return this.repo.findOne({ where: { id, isDeleted: false } });
    }
    async findActiveByTenant(tenantId) {
        return this.repo.findOne({
            where: [
                { tenantId, status: 'active', isDeleted: false },
                { tenantId, status: 'trialing', isDeleted: false },
                { tenantId, status: 'past_due', isDeleted: false },
                { tenantId, status: 'paused', isDeleted: false },
            ],
            order: { createdAt: 'DESC' },
        });
    }
    async findAllByTenant(tenantId) {
        return this.repo.find({
            where: { tenantId, isDeleted: false },
            order: { createdAt: 'DESC' },
        });
    }
    async findExpiredTrials(before) {
        return this.repo.find({
            where: {
                status: 'trialing',
                trialEnd: (0, typeorm_2.LessThanOrEqual)(before),
                isDeleted: false,
            },
        });
    }
    async findExpiredPeriods(before) {
        return this.repo.find({
            where: {
                status: 'past_due',
                periodEnd: (0, typeorm_2.LessThanOrEqual)(before),
                isDeleted: false,
            },
        });
    }
    async updateStatus(id, status, extra = {}) {
        await this.repo.update({ id }, { status, ...extra, updatedAt: new Date() });
    }
    async update(id, data) {
        await this.repo.update({ id }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id } });
    }
    async countByStatus(tenantId, status) {
        return this.repo.count({ where: { tenantId, status, isDeleted: false } });
    }
};
exports.SubscriptionRepository = SubscriptionRepository;
exports.SubscriptionRepository = SubscriptionRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(subscription_entity_1.SubscriptionEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SubscriptionRepository);
//# sourceMappingURL=subscription.repository.js.map