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
exports.RateCardRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const rate_card_entity_1 = require("../entities/rate-card.entity");
let RateCardRepository = class RateCardRepository {
    constructor(repo) {
        this.repo = repo;
    }
    scopedQb(alias, tenantId) {
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId })
            .andWhere(`${alias}.isDeleted = false`);
    }
    async insert(data) {
        const entity = this.repo.create(data);
        return this.repo.save(entity);
    }
    async findById(id, tenantId) {
        return this.scopedQb('rc', tenantId)
            .andWhere('rc.id = :id', { id })
            .getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const entity = await this.findById(id, tenantId);
        if (!entity)
            throw new common_1.NotFoundException(`Rate card ${id} not found`);
        return entity;
    }
    async findAll(tenantId, opts) {
        const qb = this.scopedQb('rc', tenantId).orderBy('rc.name', 'ASC');
        if (opts.isActive !== undefined) {
            qb.andWhere('rc.isActive = :isActive', { isActive: opts.isActive });
        }
        const [data, total] = await qb
            .skip((opts.page - 1) * opts.limit)
            .take(opts.limit)
            .getManyAndCount();
        return { data, total };
    }
    async update(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, data);
        return this.findByIdOrFail(id, tenantId);
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true });
    }
};
exports.RateCardRepository = RateCardRepository;
exports.RateCardRepository = RateCardRepository = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(rate_card_entity_1.RateCardEntity)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], RateCardRepository);
//# sourceMappingURL=rate-card.repository.js.map