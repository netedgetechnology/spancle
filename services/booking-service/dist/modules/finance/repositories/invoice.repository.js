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
var InvoiceRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const invoice_entity_1 = require("../entities/invoice.entity");
const invoice_line_entity_1 = require("../entities/invoice-line.entity");
const invoice_line_entity_2 = require("../entities/invoice-line.entity");
const invoice_line_entity_3 = require("../entities/invoice-line.entity");
let InvoiceRepository = InvoiceRepository_1 = class InvoiceRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(InvoiceRepository_1.name);
    }
    get invoiceRepo() { return this.dataSource.getRepository(invoice_entity_1.InvoiceEntity); }
    get lineRepo() { return this.dataSource.getRepository(invoice_line_entity_1.InvoiceLineEntity); }
    get taxRepo() { return this.dataSource.getRepository(invoice_line_entity_2.InvoiceTaxEntity); }
    get referenceRepo() { return this.dataSource.getRepository(invoice_line_entity_3.InvoiceReferenceEntity); }
    scopedQb(alias, tenantId) {
        return this.invoiceRepo
            .createQueryBuilder(alias)
            .where(`${alias}.tenantId = :tenantId`, { tenantId })
            .andWhere(`${alias}.isDeleted = false`);
    }
    async create(input) {
        return this.invoiceRepo.save(this.invoiceRepo.create({
            tenantId: input.tenantId,
            sourceType: input.sourceType,
            sourceId: input.sourceId ?? null,
            customerId: input.customerId ?? null,
            customerName: input.customerName,
            customerEmail: input.customerEmail ?? null,
            currency: input.currency,
            periodStart: input.periodStart ?? null,
            periodEnd: input.periodEnd ?? null,
            couponCode: input.couponCode ?? null,
            dueAt: input.dueAt ?? null,
            createdById: input.createdById ?? null,
            updatedById: input.createdById ?? null,
            status: 'draft',
            subtotalMinor: 0,
            discountMinor: 0,
            taxMinor: 0,
            totalMinor: 0,
            amountPaidMinor: 0,
            outstandingMinor: 0,
        }));
    }
    async findById(id, tenantId) {
        return this.scopedQb('inv', tenantId).andWhere('inv.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const inv = await this.findById(id, tenantId);
        if (!inv)
            throw new common_1.NotFoundException(`Invoice ${id} not found`);
        return inv;
    }
    async findByNumber(invoiceNumber, tenantId) {
        return this.scopedQb('inv', tenantId)
            .andWhere('inv.invoiceNumber = :invoiceNumber', { invoiceNumber })
            .getOne();
    }
    async findBySource(sourceType, sourceId, tenantId) {
        return this.scopedQb('inv', tenantId)
            .andWhere('inv.sourceType = :sourceType', { sourceType })
            .andWhere('inv.sourceId   = :sourceId', { sourceId })
            .getOne();
    }
    async findAll(tenantId, opts = {}) {
        const qb = this.scopedQb('inv', tenantId)
            .orderBy('inv.createdAt', 'DESC');
        if (opts.status)
            qb.andWhere('inv.status     = :status', { status: opts.status });
        if (opts.customerId)
            qb.andWhere('inv.customerId = :customerId', { customerId: opts.customerId });
        if (opts.limit)
            qb.take(opts.limit);
        if (opts.offset)
            qb.skip(opts.offset);
        return qb.getMany();
    }
    async update(id, tenantId, data) {
        await this.invoiceRepo.update({ id, tenantId }, data);
    }
    async nextInvoiceNumber(tenantId, financialYear) {
        const prefix = `INV-${financialYear}-`;
        const result = await this.dataSource.query(`SELECT COUNT(*) AS count
       FROM finance_invoices
       WHERE tenant_id   = $1
         AND invoice_number LIKE $2
         AND is_deleted  = FALSE`, [tenantId, `${prefix}%`]);
        const next = (parseInt(result[0]?.count ?? '0', 10)) + 1;
        return `${prefix}${String(next).padStart(5, '0')}`;
    }
    async createLine(input) {
        return this.lineRepo.save(this.lineRepo.create({
            tenantId: input.tenantId,
            invoiceId: input.invoiceId,
            description: input.description,
            lineType: input.lineType,
            quantity: input.quantity,
            unitPriceMinor: input.unitPriceMinor,
            subtotalMinor: input.subtotalMinor,
            discountMinor: input.discountMinor,
            netMinor: input.netMinor,
            taxMinor: input.taxMinor,
            appliedRuleIds: input.appliedRuleIds ?? null,
            couponCode: input.couponCode ?? null,
            couponRuleId: input.couponRuleId ?? null,
            discountSource: input.discountSource ?? null,
            lineSourceId: input.lineSourceId ?? null,
            sortOrder: input.sortOrder ?? 0,
        }));
    }
    async findLines(invoiceId, tenantId) {
        return this.lineRepo.find({
            where: { invoiceId, tenantId },
            order: { sortOrder: 'ASC' },
        });
    }
    async createTax(input) {
        return this.taxRepo.save(this.taxRepo.create(input));
    }
    async findTaxes(invoiceId, tenantId) {
        return this.taxRepo.find({ where: { invoiceId, tenantId } });
    }
    async createReference(params) {
        const existing = await this.referenceRepo.findOne({
            where: {
                tenantId: params.tenantId,
                sourceType: params.sourceType,
                sourceId: params.sourceId,
            },
        });
        if (existing) {
            throw new common_1.ConflictException(`Invoice already exists for ${params.sourceType} ${params.sourceId}: ` +
                `${existing.invoiceNumber ?? existing.invoiceId}`);
        }
        return this.referenceRepo.save(this.referenceRepo.create({
            tenantId: params.tenantId,
            invoiceId: params.invoiceId,
            invoiceNumber: params.invoiceNumber,
            sourceType: params.sourceType,
            sourceId: params.sourceId,
        }));
    }
    async findReference(sourceType, sourceId, tenantId) {
        return this.referenceRepo.findOne({
            where: { tenantId, sourceType, sourceId },
        });
    }
    async updateReferenceNumber(invoiceId, invoiceNumber) {
        await this.referenceRepo.update({ invoiceId }, { invoiceNumber });
    }
};
exports.InvoiceRepository = InvoiceRepository;
exports.InvoiceRepository = InvoiceRepository = InvoiceRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], InvoiceRepository);
//# sourceMappingURL=invoice.repository.js.map