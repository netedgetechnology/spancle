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
var TaxRateRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaxRateRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tax_rate_entity_1 = require("../entities/tax-rate.entity");
let TaxRateRepository = TaxRateRepository_1 = class TaxRateRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(TaxRateRepository_1.name);
    }
    get repo() {
        return this.dataSource.getRepository(tax_rate_entity_1.TaxRateEntity);
    }
    async findAll(tenantId) {
        return this.repo.find({
            where: { tenantId, isActive: true },
            order: { code: 'ASC' },
        });
    }
    async findByCode(code, tenantId) {
        return this.repo.findOne({ where: { code, tenantId } });
    }
    async findByCodeOrFail(code, tenantId) {
        const r = await this.findByCode(code, tenantId);
        if (!r)
            throw new common_1.NotFoundException(`Tax rate ${code} not found`);
        return r;
    }
    async findDefault(tenantId) {
        return this.repo.findOne({ where: { tenantId, isDefault: true, isActive: true } });
    }
    async findForJurisdiction(tenantId, jurisdiction, slotDate) {
        return this.repo
            .createQueryBuilder('t')
            .where('t.tenantId = :tenantId', { tenantId })
            .andWhere('t.isActive = true')
            .andWhere('(t.jurisdiction IS NULL OR :jurisdiction LIKE t.jurisdiction || \'%\')', { jurisdiction })
            .andWhere('(t.effectiveFrom IS NULL OR t.effectiveFrom <= :date)', { date: slotDate })
            .andWhere('(t.effectiveTo IS NULL OR t.effectiveTo >= :date2)', { date2: slotDate })
            .orderBy('COALESCE(LENGTH(t.jurisdiction), 0)', 'DESC')
            .getMany();
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async update(id, data) {
        await this.repo.update({ id }, data);
        return this.repo.findOneOrFail({ where: { id } });
    }
    async seedSystemRates(rates) {
        for (const data of rates) {
            const existing = await this.findByCode(data.code, data.tenantId);
            if (!existing) {
                await this.repo.save(this.repo.create(data));
            }
        }
    }
};
exports.TaxRateRepository = TaxRateRepository;
exports.TaxRateRepository = TaxRateRepository = TaxRateRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], TaxRateRepository);
//# sourceMappingURL=tax-rate.repository.js.map