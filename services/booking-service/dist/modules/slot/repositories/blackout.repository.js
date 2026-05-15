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
var BlackoutRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlackoutRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const blackout_entity_1 = require("../entities/blackout.entity");
let BlackoutRepository = BlackoutRepository_1 = class BlackoutRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BlackoutRepository_1.name);
    }
    get repo() {
        return this.dataSource.getRepository(blackout_entity_1.BlackoutEntity);
    }
    scopedQb(alias, tenantId) {
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId })
            .andWhere(`${alias}.isDeleted = false`)
            .andWhere(`${alias}.isActive = true`);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async findByIdOrFail(id, tenantId) {
        const b = await this.findById(id, tenantId);
        if (!b)
            throw new Error(`Blackout ${id} not found`);
        return b;
    }
    async findAll(tenantId) {
        return this.repo
            .createQueryBuilder('b')
            .where('b.tenantId = :tenantId', { tenantId })
            .andWhere('b.isDeleted = false')
            .orderBy('b.startAt', 'DESC')
            .getMany();
    }
    async isBlocked(params) {
        const { tenantId, courtId, branchId, sportId, startAt, endAt } = params;
        const count = await this.scopedQb('b', tenantId)
            .andWhere('b.startAt < :endAt', { endAt })
            .andWhere('b.endAt > :startAt', { startAt })
            .andWhere(`(
          (b.scope = 'tenant')
          OR (b.scope = 'branch' AND b.branchId = :branchId)
          OR (b.scope = 'court'  AND b.courtId  = :courtId)
          ${sportId ? "OR (b.scope = 'sport' AND b.sportId = :sportId)" : ''}
        )`, { branchId, courtId, ...(sportId && { sportId }) })
            .getCount();
        return count > 0;
    }
    async findOverlapping(params) {
        const { tenantId, courtId, branchId, sportId, startAt, endAt } = params;
        return this.scopedQb('b', tenantId)
            .andWhere('b.startAt < :endAt', { endAt })
            .andWhere('b.endAt > :startAt', { startAt })
            .andWhere(`(
          (b.scope = 'tenant')
          OR (b.scope = 'branch' AND b.branchId = :branchId)
          OR (b.scope = 'court'  AND b.courtId  = :courtId)
          ${sportId ? "OR (b.scope = 'sport' AND b.sportId = :sportId)" : ''}
        )`, { branchId, courtId, ...(sportId && { sportId }) })
            .getMany();
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, isActive: false, deletedAt: new Date(), updatedAt: new Date() });
    }
};
exports.BlackoutRepository = BlackoutRepository;
exports.BlackoutRepository = BlackoutRepository = BlackoutRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BlackoutRepository);
//# sourceMappingURL=blackout.repository.js.map