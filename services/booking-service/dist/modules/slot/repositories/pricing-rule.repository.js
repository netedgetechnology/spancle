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
var PricingRuleRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingRuleRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pricing_rule_entity_1 = require("../entities/pricing-rule.entity");
let PricingRuleRepository = PricingRuleRepository_1 = class PricingRuleRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(PricingRuleRepository_1.name);
    }
    get repo() {
        return this.dataSource.getRepository(pricing_rule_entity_1.PricingRuleEntity);
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
        const r = await this.findById(id, tenantId);
        if (!r)
            throw new Error(`PricingRule ${id} not found`);
        return r;
    }
    async findAll(tenantId, includeInactive = false) {
        const qb = this.repo
            .createQueryBuilder('r')
            .where('r.tenantId = :tenantId', { tenantId })
            .andWhere('r.isDeleted = false');
        if (!includeInactive)
            qb.andWhere('r.isActive = true');
        return qb.orderBy('r.priority', 'DESC').addOrderBy('r.ruleType', 'ASC').getMany();
    }
    async findMatchingRules(params) {
        const { tenantId, courtId, branchId, sportId, slotDate, slotTime, dayOfWeek } = params;
        const qb = this.scopedQb('r', tenantId)
            .andWhere(`(
          (r.scope = 'tenant')
          OR (r.scope = 'branch' AND r.branchId = :branchId)
          OR (r.scope = 'court'  AND r.courtId  = :courtId)
          ${sportId ? "OR (r.scope = 'sport' AND r.sportId = :sportId)" : ''}
        )`, { branchId, courtId, ...(sportId && { sportId }) })
            .andWhere("(r.validFrom IS NULL OR r.validFrom <= :slotDate)", { slotDate })
            .andWhere("(r.validUntil IS NULL OR r.validUntil >= :slotDate)")
            .andWhere(`(r.daysOfWeek IS NULL OR r.daysOfWeek = '[]'::jsonb OR r.daysOfWeek @> :dayJson::jsonb)`, { dayJson: JSON.stringify([dayOfWeek]) })
            .andWhere("(r.timeStart IS NULL OR r.timeStart <= :slotTime)", { slotTime })
            .andWhere("(r.timeEnd IS NULL OR r.timeEnd > :slotTime)")
            .orderBy('r.priority', 'DESC')
            .addOrderBy('r.ruleType', 'ASC');
        return qb.getMany();
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, isActive: false, deletedAt: new Date(), updatedAt: new Date() });
    }
    async findCouponRule(couponCode, tenantId, slotDate) {
        return this.scopedQb('r', tenantId)
            .andWhere("r.ruleType = 'coupon'")
            .andWhere('UPPER(r.couponCode) = :code', { code: couponCode.toUpperCase() })
            .andWhere('(r.validFrom IS NULL OR r.validFrom <= :date)', { date: slotDate })
            .andWhere('(r.validUntil IS NULL OR r.validUntil >= :date2)', { date2: slotDate })
            .orderBy('r.priority', 'DESC')
            .getOne();
    }
};
exports.PricingRuleRepository = PricingRuleRepository;
exports.PricingRuleRepository = PricingRuleRepository = PricingRuleRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], PricingRuleRepository);
//# sourceMappingURL=pricing-rule.repository.js.map