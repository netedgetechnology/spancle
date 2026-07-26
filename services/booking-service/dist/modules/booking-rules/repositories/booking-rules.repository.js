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
exports.BookingRulesRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const booking_rules_entity_1 = require("../entities/booking-rules.entity");
let BookingRulesRepository = class BookingRulesRepository {
    constructor(repo) {
        this.repo = repo;
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async findByTenant(tenantId) {
        return this.repo.find({
            where: { tenantId, isDeleted: false },
            order: { scope: 'ASC', createdAt: 'ASC' },
        });
    }
    async update(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, data);
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
    }
    async resolveForBooking(params) {
        const { tenantId, branchId, sportId, courtId } = params;
        const candidates = [
            { scope: 'court', value: courtId ?? null },
            { scope: 'sport', value: sportId ?? null },
            { scope: 'branch', value: branchId ?? null },
            { scope: 'tenant', value: null },
        ];
        for (const { scope, value } of candidates) {
            if (scope !== 'tenant' && !value)
                continue;
            const where = { tenantId, scope, isActive: true, isDeleted: false };
            if (scope === 'court')
                where['courtId'] = value;
            if (scope === 'sport')
                where['sportId'] = value;
            if (scope === 'branch')
                where['branchId'] = value;
            const rule = await this.repo.findOne({ where: where });
            if (rule)
                return rule;
        }
        return null;
    }
};
exports.BookingRulesRepository = BookingRulesRepository;
exports.BookingRulesRepository = BookingRulesRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(booking_rules_entity_1.BookingRulesEntity)),
    __metadata("design:paramtypes", [Function])
], BookingRulesRepository);
//# sourceMappingURL=booking-rules.repository.js.map