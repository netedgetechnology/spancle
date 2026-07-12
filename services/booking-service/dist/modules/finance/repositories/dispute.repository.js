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
var DisputeRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DisputeRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const dispute_entity_1 = require("../entities/dispute.entity");
let DisputeRepository = DisputeRepository_1 = class DisputeRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(DisputeRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(dispute_entity_1.DisputeEntity); }
    scopedQb(alias, tenantId) {
        return this.repo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId });
    }
    async create(input, manager) {
        const dispute = manager.create(dispute_entity_1.DisputeEntity, {
            tenantId: input.tenantId,
            disputeNumber: input.disputeNumber,
            paymentId: input.paymentId,
            gateway: input.gateway,
            gatewayDisputeId: input.gatewayDisputeId,
            reason: input.reason,
            status: 'opened',
            disputedAmountMinor: input.disputedAmountMinor,
            feeAmountMinor: input.feeAmountMinor,
            currency: input.currency,
            openedAt: input.openedAt,
            evidenceDueAt: input.evidenceDueAt ?? null,
            metadata: input.metadata ?? null,
            createdById: input.createdById ?? null,
            updatedById: input.createdById ?? null,
        });
        try {
            return await manager.save(dispute);
        }
        catch (err) {
            const msg = err.message ?? '';
            if (msg.includes('uq_finance_disputes_tenant_gateway_dispute')) {
                throw new common_1.ConflictException(`Dispute already exists for gateway=${input.gateway} disputeId=${input.gatewayDisputeId}`);
            }
            throw err;
        }
    }
    async findById(id, tenantId) {
        return this.scopedQb('d', tenantId).andWhere('d.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const d = await this.findById(id, tenantId);
        if (!d)
            throw new common_1.NotFoundException(`Dispute ${id} not found`);
        return d;
    }
    async findByGatewayDisputeId(gateway, gatewayDisputeId, tenantId) {
        return this.scopedQb('d', tenantId)
            .andWhere('d.gateway          = :gateway', { gateway })
            .andWhere('d.gatewayDisputeId = :gatewayDisputeId', { gatewayDisputeId })
            .getOne();
    }
    async findByPayment(paymentId, tenantId) {
        return this.scopedQb('d', tenantId)
            .andWhere('d.paymentId = :paymentId', { paymentId })
            .orderBy('d.openedAt', 'DESC')
            .getMany();
    }
    async findAll(tenantId, opts = {}) {
        const qb = this.scopedQb('d', tenantId).orderBy('d.openedAt', 'DESC');
        if (opts.status)
            qb.andWhere('d.status = :status', { status: opts.status });
        if (opts.limit)
            qb.take(opts.limit);
        if (opts.offset)
            qb.skip(opts.offset);
        return qb.getMany();
    }
    async update(id, tenantId, data, manager) {
        const repo = manager
            ? manager.getRepository(dispute_entity_1.DisputeEntity)
            : this.repo;
        await repo.update({ id, tenantId }, data);
    }
    async nextDisputeNumber(tenantId) {
        const now = new Date();
        const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prefix = `DSP-${yyyymm}-`;
        const result = await this.dataSource.query(`SELECT COUNT(*) AS count FROM finance_disputes
       WHERE tenant_id = $1 AND dispute_number LIKE $2`, [tenantId, `${prefix}%`]);
        const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
        return `${prefix}${String(next).padStart(5, '0')}`;
    }
    async totalActiveDisputedAmount(paymentId, tenantId, manager) {
        const result = await manager
            .createQueryBuilder(dispute_entity_1.DisputeEntity, 'd')
            .select('COALESCE(SUM(d.disputedAmountMinor), 0)', 'total')
            .where('d.paymentId = :paymentId', { paymentId })
            .andWhere('d.tenantId  = :tenantId', { tenantId })
            .andWhere("d.status   != 'cancelled'")
            .getRawOne();
        return parseInt(result?.total ?? '0', 10);
    }
};
exports.DisputeRepository = DisputeRepository;
exports.DisputeRepository = DisputeRepository = DisputeRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], DisputeRepository);
//# sourceMappingURL=dispute.repository.js.map