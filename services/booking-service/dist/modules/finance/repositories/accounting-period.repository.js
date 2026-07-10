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
var AccountingPeriodRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingPeriodRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const accounting_period_entity_1 = require("../entities/accounting-period.entity");
let AccountingPeriodRepository = AccountingPeriodRepository_1 = class AccountingPeriodRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(AccountingPeriodRepository_1.name);
    }
    get repo() {
        return this.dataSource.getRepository(accounting_period_entity_1.AccountingPeriodEntity);
    }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByPeriod(period, tenantId) {
        return this.repo.findOne({ where: { period, tenantId } });
    }
    async findByPeriodOrFail(period, tenantId) {
        const p = await this.findByPeriod(period, tenantId);
        if (!p)
            throw new common_1.NotFoundException(`Accounting period ${period} not found`);
        return p;
    }
    async findOpen(tenantId) {
        return this.repo.findOne({ where: { tenantId, status: 'open' } });
    }
    async findAll(tenantId) {
        return this.repo.find({
            where: { tenantId },
            order: { period: 'DESC' },
        });
    }
    async updateStatus(id, status, extra) {
        await this.repo.update({ id }, { status, ...extra });
        return this.repo.findOneOrFail({ where: { id } });
    }
};
exports.AccountingPeriodRepository = AccountingPeriodRepository;
exports.AccountingPeriodRepository = AccountingPeriodRepository = AccountingPeriodRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], AccountingPeriodRepository);
//# sourceMappingURL=accounting-period.repository.js.map