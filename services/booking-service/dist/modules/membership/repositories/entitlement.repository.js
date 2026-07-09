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
var EntitlementRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntitlementRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entitlement_balance_entity_1 = require("../entities/entitlement-balance.entity");
const membership_transaction_entity_1 = require("../entities/membership-transaction.entity");
const membership_audit_log_entity_1 = require("../entities/membership-audit-log.entity");
let EntitlementRepository = EntitlementRepository_1 = class EntitlementRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(EntitlementRepository_1.name);
    }
    get balanceRepo() {
        return this.dataSource.getRepository(entitlement_balance_entity_1.EntitlementBalanceEntity);
    }
    async findByMembership(membershipId, tenantId) {
        return this.balanceRepo.find({
            where: { membershipId, tenantId },
            order: { benefitType: 'ASC' },
        });
    }
    async findByBenefitType(membershipId, benefitType, tenantId) {
        return this.balanceRepo.findOne({
            where: { membershipId, benefitType, tenantId },
        });
    }
    async findByBenefitTypeOrFail(membershipId, benefitType, tenantId) {
        const b = await this.findByBenefitType(membershipId, benefitType, tenantId);
        if (!b) {
            throw new common_1.NotFoundException(`Entitlement balance for benefit "${benefitType}" not found on membership ${membershipId}`);
        }
        return b;
    }
    async create(data) {
        return this.balanceRepo.save(this.balanceRepo.create(data));
    }
    async update(id, data) {
        await this.balanceRepo.update({ id }, data);
    }
    async lockBalance(membershipId, benefitType, tenantId, manager) {
        const result = await manager
            .createQueryBuilder(entitlement_balance_entity_1.EntitlementBalanceEntity, 'eb')
            .setLock('pessimistic_write')
            .where('eb.membershipId = :membershipId', { membershipId })
            .andWhere('eb.benefitType = :benefitType', { benefitType })
            .andWhere('eb.tenantId = :tenantId', { tenantId })
            .getOne();
        return result;
    }
    async insertTransaction(data, manager) {
        const repo = manager.getRepository(membership_transaction_entity_1.MembershipTransactionEntity);
        return repo.save(repo.create(data));
    }
    async insertAuditLog(data, manager) {
        const repo = manager.getRepository(membership_audit_log_entity_1.MembershipAuditLogEntity);
        return repo.save(repo.create(data));
    }
    async findDueForReset(batchSize = 100) {
        return this.balanceRepo
            .createQueryBuilder('eb')
            .where('eb.nextResetAt <= :now', { now: new Date() })
            .andWhere('eb.nextResetAt IS NOT NULL')
            .andWhere('eb.isActive = true')
            .orderBy('eb.nextResetAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findStaleReservations(batchSize = 100) {
        return this.balanceRepo
            .createQueryBuilder('eb')
            .where('eb.reservedUnits > 0')
            .andWhere('eb.isActive = false')
            .orderBy('eb.updatedAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async deactivateByMembership(membershipId, tenantId, manager) {
        await manager
            .createQueryBuilder()
            .update(entitlement_balance_entity_1.EntitlementBalanceEntity)
            .set({ isActive: false, reservedUnits: 0 })
            .where('membershipId = :membershipId', { membershipId })
            .andWhere('tenantId = :tenantId', { tenantId })
            .execute();
    }
};
exports.EntitlementRepository = EntitlementRepository;
exports.EntitlementRepository = EntitlementRepository = EntitlementRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], EntitlementRepository);
//# sourceMappingURL=entitlement.repository.js.map