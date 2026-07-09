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
var MembershipPlanRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipPlanRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const membership_plan_entity_1 = require("../entities/membership-plan.entity");
const membership_benefit_entity_1 = require("../entities/membership-benefit.entity");
let MembershipPlanRepository = MembershipPlanRepository_1 = class MembershipPlanRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(MembershipPlanRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(membership_plan_entity_1.MembershipPlanEntity); }
    get benefitRepo() { return this.dataSource.getRepository(membership_benefit_entity_1.MembershipBenefitEntity); }
    scopedQb(alias, tenantId) {
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId })
            .andWhere(`${alias}.isDeleted = false`);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findAll(tenantId, activeOnly = false) {
        const qb = this.scopedQb('p', tenantId).orderBy('p.sortOrder', 'ASC');
        if (activeOnly)
            qb.andWhere('p.isActive = true');
        return qb.getMany();
    }
    async findById(id, tenantId) {
        return this.scopedQb('p', tenantId).andWhere('p.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const plan = await this.findById(id, tenantId);
        if (!plan)
            throw new common_1.NotFoundException(`Membership plan ${id} not found`);
        return plan;
    }
    async findBySlug(slug, tenantId) {
        return this.scopedQb('p', tenantId)
            .andWhere('p.slug = :slug', { slug })
            .getOne();
    }
    async update(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, data);
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, isActive: false, deletedAt: new Date() });
    }
    async findBenefits(planId, tenantId) {
        return this.benefitRepo.find({
            where: { planId, tenantId, isDeleted: false },
            order: { sortOrder: 'ASC' },
        });
    }
    async createBenefit(data) {
        return this.benefitRepo.save(this.benefitRepo.create(data));
    }
    async deleteBenefit(id, tenantId) {
        await this.benefitRepo.update({ id, tenantId }, { isDeleted: true });
    }
};
exports.MembershipPlanRepository = MembershipPlanRepository;
exports.MembershipPlanRepository = MembershipPlanRepository = MembershipPlanRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], MembershipPlanRepository);
//# sourceMappingURL=membership-plan.repository.js.map