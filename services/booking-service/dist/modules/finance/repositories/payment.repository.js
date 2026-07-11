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
var PaymentRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_entity_1 = require("../entities/payment.entity");
let PaymentRepository = PaymentRepository_1 = class PaymentRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(PaymentRepository_1.name);
    }
    get paymentRepo() { return this.dataSource.getRepository(payment_entity_1.PaymentEntity); }
    get allocationRepo() { return this.dataSource.getRepository(payment_entity_1.PaymentAllocationEntity); }
    scopedQb(alias, tenantId) {
        return this.paymentRepo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId });
    }
    async create(input) {
        return this.paymentRepo.save(this.paymentRepo.create({
            tenantId: input.tenantId,
            reference: input.reference,
            method: input.method,
            gateway: input.gateway,
            amountMinor: input.amountMinor,
            currency: input.currency,
            customerId: input.customerId ?? null,
            idempotencyKey: input.idempotencyKey ?? null,
            ipAddress: input.ipAddress ?? null,
            deviceId: input.deviceId ?? null,
            createdById: input.createdById ?? null,
            updatedById: input.createdById ?? null,
            status: 'initiated',
            capturedAmountMinor: 0,
            allocatedMinor: 0,
            unallocatedMinor: 0,
        }));
    }
    async findById(id, tenantId) {
        return this.scopedQb('p', tenantId).andWhere('p.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const p = await this.findById(id, tenantId);
        if (!p)
            throw new common_1.NotFoundException(`Payment ${id} not found`);
        return p;
    }
    async findByIdempotencyKey(key, tenantId) {
        return this.scopedQb('p', tenantId)
            .andWhere('p.idempotencyKey = :key', { key })
            .getOne();
    }
    async findByGatewayPaymentId(gatewayPaymentId, tenantId) {
        return this.scopedQb('p', tenantId)
            .andWhere('p.gatewayPaymentId = :gatewayPaymentId', { gatewayPaymentId })
            .getOne();
    }
    async findAll(tenantId, opts = {}) {
        const qb = this.scopedQb('p', tenantId).orderBy('p.createdAt', 'DESC');
        if (opts.status)
            qb.andWhere('p.status     = :status', { status: opts.status });
        if (opts.customerId)
            qb.andWhere('p.customerId = :customerId', { customerId: opts.customerId });
        if (opts.limit)
            qb.take(opts.limit);
        if (opts.offset)
            qb.skip(opts.offset);
        return qb.getMany();
    }
    async update(id, tenantId, data) {
        await this.paymentRepo.update({ id, tenantId }, data);
    }
    async nextReference(tenantId) {
        const now = new Date();
        const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
        const prefix = `PAY-${yyyymm}-`;
        const result = await this.dataSource.query(`SELECT COUNT(*) AS count
       FROM finance_payments
       WHERE tenant_id = $1 AND reference LIKE $2`, [tenantId, `${prefix}%`]);
        const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
        return `${prefix}${String(next).padStart(5, '0')}`;
    }
    async createAllocation(params) {
        return this.allocationRepo.save(this.allocationRepo.create({
            tenantId: params.tenantId,
            paymentId: params.paymentId,
            invoiceId: params.invoiceId,
            allocatedMinor: params.allocatedMinor,
            currency: params.currency,
        }));
    }
    async findAllocationsByPayment(paymentId, tenantId) {
        return this.allocationRepo.find({
            where: { paymentId, tenantId },
            order: { allocatedAt: 'ASC' },
        });
    }
    async findAllocationsByInvoice(invoiceId, tenantId) {
        return this.allocationRepo.find({
            where: { invoiceId, tenantId },
            order: { allocatedAt: 'ASC' },
        });
    }
    async totalAllocatedForInvoice(invoiceId, tenantId) {
        const result = await this.allocationRepo
            .createQueryBuilder('a')
            .select('COALESCE(SUM(a.allocatedMinor), 0)', 'total')
            .where('a.invoiceId = :invoiceId', { invoiceId })
            .andWhere('a.tenantId = :tenantId', { tenantId })
            .getRawOne();
        return parseInt(result?.total ?? '0', 10);
    }
};
exports.PaymentRepository = PaymentRepository;
exports.PaymentRepository = PaymentRepository = PaymentRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], PaymentRepository);
//# sourceMappingURL=payment.repository.js.map