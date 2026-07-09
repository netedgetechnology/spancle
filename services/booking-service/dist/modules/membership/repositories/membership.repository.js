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
var MembershipRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MembershipRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const membership_entity_1 = require("../entities/membership.entity");
const membership_transaction_entity_1 = require("../entities/membership-transaction.entity");
const membership_audit_log_entity_1 = require("../entities/membership-audit-log.entity");
let MembershipRepository = MembershipRepository_1 = class MembershipRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(MembershipRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(membership_entity_1.MembershipEntity); }
    get txRepo() { return this.dataSource.getRepository(membership_transaction_entity_1.MembershipTransactionEntity); }
    get auditRepo() { return this.dataSource.getRepository(membership_audit_log_entity_1.MembershipAuditLogEntity); }
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
        return this.scopedQb('m', tenantId).andWhere('m.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const m = await this.findById(id, tenantId);
        if (!m)
            throw new common_1.NotFoundException(`Membership ${id} not found`);
        return m;
    }
    async findByMemberNumber(memberNumber, tenantId) {
        return this.scopedQb('m', tenantId)
            .andWhere('m.memberNumber = :memberNumber', { memberNumber })
            .getOne();
    }
    async findActiveByUser(userId, tenantId) {
        return this.scopedQb('m', tenantId)
            .andWhere('m.userId = :userId', { userId })
            .andWhere(`m.status NOT IN ('upgraded','downgraded','expired','cancelled')`)
            .orderBy('m.createdAt', 'DESC')
            .getOne();
    }
    async query(params) {
        const qb = this.scopedQb('m', params.tenantId)
            .orderBy('m.createdAt', 'DESC');
        if (params.userId)
            qb.andWhere('m.userId = :userId', { userId: params.userId });
        if (params.planId)
            qb.andWhere('m.planId = :planId', { planId: params.planId });
        if (params.status)
            qb.andWhere('m.status = :status', { status: params.status });
        if (params.membershipType)
            qb.andWhere('m.membershipType = :membershipType', { membershipType: params.membershipType });
        if (params.limit)
            qb.take(params.limit);
        if (params.offset)
            qb.skip(params.offset);
        return qb.getMany();
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, data);
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
    }
    async insertTransaction(data) {
        return this.txRepo.save(this.txRepo.create(data));
    }
    async findTransactions(membershipId, tenantId, limit = 50, offset = 0) {
        return this.txRepo
            .createQueryBuilder('t')
            .where('t.tenantId = :tenantId', { tenantId })
            .andWhere('t.membershipId = :membershipId', { membershipId })
            .orderBy('t.createdAt', 'DESC')
            .take(limit)
            .skip(offset)
            .getMany();
    }
    async insertAuditLog(data) {
        return this.auditRepo.save(this.auditRepo.create(data));
    }
    async findExpired(batchSize = 50) {
        return this.repo
            .createQueryBuilder('m')
            .where(`m.status IN ('trial', 'pending_payment', 'payment_failed')`)
            .andWhere('m.expiresAt < :now', { now: new Date() })
            .andWhere('m.isDeleted = false')
            .orderBy('m.expiresAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findExpiredTrials(batchSize = 50) {
        return this.repo
            .createQueryBuilder('m')
            .where(`m.status = 'trial'`)
            .andWhere('m.trialEndsAt < :now', { now: new Date() })
            .andWhere('m.isDeleted = false')
            .orderBy('m.trialEndsAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findDueForRenewal(leadDays, batchSize = 50) {
        const threshold = new Date(Date.now() + leadDays * 86_400_000);
        return this.repo
            .createQueryBuilder('m')
            .where(`m.status IN ('active', 'pending_renewal')`)
            .andWhere('m.renewsAt IS NOT NULL')
            .andWhere('m.renewsAt <= :threshold', { threshold })
            .andWhere('m.autoRenew = true')
            .andWhere('m.isDeleted = false')
            .orderBy('m.renewsAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findGraceExpired(batchSize = 50) {
        return this.repo
            .createQueryBuilder('m')
            .where(`m.status = 'payment_failed'`)
            .andWhere('m.expiresAt IS NOT NULL')
            .andWhere('m.expiresAt < :now', { now: new Date() })
            .andWhere('m.isDeleted = false')
            .orderBy('m.expiresAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findFreezeExpired(batchSize = 50) {
        return this.repo
            .createQueryBuilder('m')
            .where(`m.status = 'frozen'`)
            .andWhere('m.frozenUntil < :now', { now: new Date() })
            .andWhere('m.isDeleted = false')
            .orderBy('m.frozenUntil', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findPendingDowngrades(batchSize = 50) {
        return this.repo
            .createQueryBuilder('m')
            .where(`m.status = 'active'`)
            .andWhere('m.pendingDowngradePlanId IS NOT NULL')
            .andWhere('m.renewsAt IS NOT NULL')
            .andWhere('m.renewsAt <= :now', { now: new Date() })
            .andWhere('m.isDeleted = false')
            .orderBy('m.renewsAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findPendingCancellations(batchSize = 50) {
        return this.repo
            .createQueryBuilder('m')
            .where(`m.status = 'cancellation_pending'`)
            .andWhere('m.renewsAt IS NOT NULL')
            .andWhere('m.renewsAt <= :now', { now: new Date() })
            .andWhere('m.isDeleted = false')
            .orderBy('m.renewsAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async activeTenants() {
        const rows = await this.repo.query(`SELECT DISTINCT tenant_id
       FROM memberships
       WHERE is_deleted = false
         AND status NOT IN ('upgraded','downgraded','expired','cancelled')
       LIMIT 200`);
        return rows.map((r) => r.tenant_id);
    }
};
exports.MembershipRepository = MembershipRepository;
exports.MembershipRepository = MembershipRepository = MembershipRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], MembershipRepository);
//# sourceMappingURL=membership.repository.js.map