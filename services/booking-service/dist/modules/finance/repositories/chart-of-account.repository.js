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
var ChartOfAccountRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChartOfAccountRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const chart_of_account_entity_1 = require("../entities/chart-of-account.entity");
let ChartOfAccountRepository = ChartOfAccountRepository_1 = class ChartOfAccountRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(ChartOfAccountRepository_1.name);
    }
    get repo() {
        return this.dataSource.getRepository(chart_of_account_entity_1.ChartOfAccountEntity);
    }
    async findAll(tenantId) {
        return this.repo.find({
            where: { tenantId },
            order: { code: 'ASC' },
        });
    }
    async findByCode(code, tenantId) {
        return this.repo.findOne({ where: { code, tenantId } });
    }
    async findByCodeOrFail(code, tenantId) {
        const a = await this.findByCode(code, tenantId);
        if (!a)
            throw new common_1.NotFoundException(`Account ${code} not found`);
        return a;
    }
    async findByType(type, tenantId) {
        return this.repo.find({
            where: { type, tenantId, isActive: true },
            order: { code: 'ASC' },
        });
    }
    async create(data) {
        const existing = await this.findByCode(data.code, data.tenantId);
        if (existing)
            throw new common_1.ConflictException(`Account code ${data.code} already exists`);
        return this.repo.save(this.repo.create(data));
    }
    async deactivate(code, tenantId) {
        const account = await this.findByCodeOrFail(code, tenantId);
        if (account.isSystem) {
            throw new common_1.BadRequestException(`System account ${code} cannot be deactivated`);
        }
        await this.repo.update({ id: account.id }, { isActive: false });
    }
    async seedSystemAccounts(accounts) {
        for (const data of accounts) {
            const existing = await this.findByCode(data.code, data.tenantId);
            if (!existing) {
                await this.repo.save(this.repo.create(data));
            }
        }
    }
};
exports.ChartOfAccountRepository = ChartOfAccountRepository;
exports.ChartOfAccountRepository = ChartOfAccountRepository = ChartOfAccountRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], ChartOfAccountRepository);
//# sourceMappingURL=chart-of-account.repository.js.map