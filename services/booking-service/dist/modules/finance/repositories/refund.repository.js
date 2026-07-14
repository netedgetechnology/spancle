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
var RefundRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefundRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const refund_entity_1 = require("../entities/refund.entity");
let RefundRepository = RefundRepository_1 = class RefundRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(RefundRepository_1.name);
    }
    get refundRepo() { return this.dataSource.getRepository(refund_entity_1.RefundEntity); }
    get allocationRepo() { return this.dataSource.getRepository(refund_entity_1.RefundLineAllocationEntity); }
    scopedQb(alias, tenantId) {
        return this.refundRepo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId });
    }
    async create(input, manager) {
        const refund = manager.create(refund_entity_1.RefundEntity, {
            tenantId: input.tenantId,
            refundNumber: input.refundNumber,
            paymentId: input.paymentId,
            invoiceId: input.invoiceId,
            amountMinor: input.amountMinor,
            currency: input.currency,
            method: input.method,
            idempotencyKey: input.idempotencyKey,
            callerIdempotencyKey: input.callerIdempotencyKey ?? null,
            status: 'pending',
            pendingAt: new Date(),
            sourceType: input.sourceType ?? null,
            sourceId: input.sourceId ?? null,
            createdById: input.createdById ?? null,
            updatedById: input.createdById ?? null,
        });
        try {
            return await manager.save(refund);
        }
        catch (err) {
            throw err;
        }
    }
    validateImmutableIdentity(existing, dto) {
        return (existing.paymentId === dto.paymentId &&
            existing.invoiceId === dto.invoiceId &&
            existing.amountMinor === dto.amountMinor &&
            existing.currency.toUpperCase() === dto.currency.toUpperCase());
    }
    async findById(id, tenantId) {
        return this.scopedQb('r', tenantId).andWhere('r.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const r = await this.findById(id, tenantId);
        if (!r)
            throw new common_1.NotFoundException(`Refund ${id} not found`);
        return r;
    }
    async findByIdempotencyKey(idempotencyKey, tenantId) {
        return this.scopedQb('r', tenantId)
            .andWhere('r.idempotencyKey = :idempotencyKey', { idempotencyKey })
            .getOne();
    }
    async findByCallerIdempotencyKey(callerIdempotencyKey, tenantId, manager) {
        const repo = manager ? manager.getRepository(refund_entity_1.RefundEntity) : this.refundRepo;
        return repo.findOne({ where: { tenantId, callerIdempotencyKey } });
    }
    async findByInvoice(invoiceId, tenantId) {
        return this.scopedQb('r', tenantId)
            .andWhere('r.invoiceId = :invoiceId', { invoiceId })
            .orderBy('r.createdAt', 'DESC')
            .getMany();
    }
    async findByPayment(paymentId, tenantId) {
        return this.scopedQb('r', tenantId)
            .andWhere('r.paymentId = :paymentId', { paymentId })
            .orderBy('r.createdAt', 'DESC')
            .getMany();
    }
    async findAll(tenantId, opts = {}) {
        const qb = this.scopedQb('r', tenantId).orderBy('r.createdAt', 'DESC');
        if (opts.status)
            qb.andWhere('r.status = :status', { status: opts.status });
        if (opts.limit)
            qb.take(opts.limit);
        if (opts.offset)
            qb.skip(opts.offset);
        return qb.getMany();
    }
    async update(id, tenantId, data, manager) {
        const repo = manager ? manager.getRepository(refund_entity_1.RefundEntity) : this.refundRepo;
        await repo.update({ id, tenantId }, data);
    }
    async nextRefundNumber(tenantId) {
        const now = new Date();
        const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prefix = `REF-${yyyymm}-`;
        const result = await this.dataSource.query(`SELECT COUNT(*) AS count FROM finance_refunds
       WHERE tenant_id = $1 AND refund_number LIKE $2`, [tenantId, `${prefix}%`]);
        const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
        return `${prefix}${String(next).padStart(5, '0')}`;
    }
    async totalActiveRefundedAmount(invoiceId, tenantId, manager) {
        const result = await manager
            .createQueryBuilder(refund_entity_1.RefundEntity, 'r')
            .select('COALESCE(SUM(r.amountMinor), 0)', 'total')
            .where('r.invoiceId = :invoiceId', { invoiceId })
            .andWhere('r.tenantId  = :tenantId', { tenantId })
            .andWhere("r.status   IN ('pending', 'processing', 'completed')")
            .getRawOne();
        return parseInt(result?.total ?? '0', 10);
    }
    async createAllocations(rows, manager) {
        const entities = rows.map((r) => manager.create(refund_entity_1.RefundLineAllocationEntity, r));
        await manager.save(entities);
    }
    async priorComponentAllocations(invoiceId, tenantId, manager) {
        const rows = await manager
            .createQueryBuilder(refund_entity_1.RefundLineAllocationEntity, 'rla')
            .innerJoin(refund_entity_1.RefundEntity, 'r', 'r.id = rla.refundId AND r.tenantId = rla.tenantId')
            .select('rla.componentType', 'componentType')
            .addSelect('rla.invoiceTaxId', 'invoiceTaxId')
            .addSelect('COALESCE(SUM(rla.amountMinor), 0)::int', 'priorMinor')
            .where('rla.invoiceId = :invoiceId', { invoiceId })
            .andWhere('rla.tenantId  = :tenantId', { tenantId })
            .andWhere("r.status IN ('processing', 'completed')")
            .groupBy('rla.componentType')
            .addGroupBy('rla.invoiceTaxId')
            .getRawMany();
        return rows.map((r) => ({
            componentType: r.componentType,
            invoiceTaxId: r.invoiceTaxId,
            priorMinor: parseInt(r.priorMinor, 10),
        }));
    }
};
exports.RefundRepository = RefundRepository;
exports.RefundRepository = RefundRepository = RefundRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], RefundRepository);
//# sourceMappingURL=refund.repository.js.map