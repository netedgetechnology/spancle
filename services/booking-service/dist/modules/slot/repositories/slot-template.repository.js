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
var SlotTemplateRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlotTemplateRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const slot_template_entity_1 = require("../entities/slot-template.entity");
let SlotTemplateRepository = SlotTemplateRepository_1 = class SlotTemplateRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(SlotTemplateRepository_1.name);
    }
    get repo() {
        return this.dataSource.getRepository(slot_template_entity_1.SlotTemplateEntity);
    }
    scopedQb(alias, tenantId) {
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId })
            .andWhere(`${alias}.isDeleted = false`);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id, tenantId) {
        return this.scopedQb('t', tenantId).andWhere('t.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const t = await this.findById(id, tenantId);
        if (!t)
            throw new Error(`SlotTemplate ${id} not found`);
        return t;
    }
    async findByCourt(courtId, tenantId) {
        return this.scopedQb('t', tenantId)
            .andWhere('t.courtId = :courtId', { courtId })
            .orderBy('t.createdAt', 'DESC')
            .getMany();
    }
    async findActiveForCourt(courtId, tenantId) {
        return this.scopedQb('t', tenantId)
            .andWhere('t.courtId = :courtId', { courtId })
            .andWhere('t.isActive = true')
            .andWhere("t.validFrom <= CURRENT_DATE")
            .andWhere("(t.validUntil IS NULL OR t.validUntil >= CURRENT_DATE)")
            .orderBy('t.createdAt', 'DESC')
            .getOne();
    }
    async findAllActive(tenantId) {
        return this.scopedQb('t', tenantId)
            .andWhere('t.isActive = true')
            .andWhere("t.validFrom <= CURRENT_DATE")
            .andWhere("(t.validUntil IS NULL OR t.validUntil >= CURRENT_DATE)")
            .getMany();
    }
    async findAll(tenantId) {
        return this.scopedQb('t', tenantId)
            .orderBy('t.courtId', 'ASC')
            .addOrderBy('t.createdAt', 'DESC')
            .getMany();
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() });
    }
};
exports.SlotTemplateRepository = SlotTemplateRepository;
exports.SlotTemplateRepository = SlotTemplateRepository = SlotTemplateRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], SlotTemplateRepository);
//# sourceMappingURL=slot-template.repository.js.map