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
var CourtRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CourtRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const court_entity_1 = require("../entities/court.entity");
let CourtRepository = CourtRepository_1 = class CourtRepository {
    constructor(repo) {
        this.repo = repo;
        this.logger = new common_1.Logger(CourtRepository_1.name);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findAllByTenant(tenantId) {
        return this.repo.find({
            where: { tenantId, isDeleted: false },
            order: { displayOrder: 'ASC', name: 'ASC' },
        });
    }
    async findAllByVenue(venueId, tenantId) {
        return this.repo.find({
            where: { venueId, tenantId, isDeleted: false },
            order: { displayOrder: 'ASC', courtNumber: 'ASC' },
        });
    }
    async findByIdAndTenant(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async update(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, data);
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
    }
    async isNameTaken(name, venueId, tenantId, excludeId) {
        const qb = this.repo.createQueryBuilder('c')
            .where('c.tenantId = :tenantId', { tenantId })
            .andWhere('c.venueId = :venueId', { venueId })
            .andWhere('LOWER(c.name) = LOWER(:name)', { name })
            .andWhere('c.isDeleted = false');
        if (excludeId) {
            qb.andWhere('c.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
    async isCourtNumberTaken(courtNumber, venueId, tenantId, excludeId) {
        const qb = this.repo.createQueryBuilder('c')
            .where('c.tenantId = :tenantId', { tenantId })
            .andWhere('c.venueId = :venueId', { venueId })
            .andWhere('c.courtNumber = :courtNumber', { courtNumber })
            .andWhere('c.isDeleted = false');
        if (excludeId) {
            qb.andWhere('c.id != :excludeId', { excludeId });
        }
        return (await qb.getCount()) > 0;
    }
};
exports.CourtRepository = CourtRepository;
exports.CourtRepository = CourtRepository = CourtRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(court_entity_1.CourtEntity)),
    __metadata("design:paramtypes", [Function])
], CourtRepository);
//# sourceMappingURL=court.repository.js.map