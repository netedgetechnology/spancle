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
var PaymentCorrelationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentCorrelationService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const payment_correlation_repository_1 = require("../repositories/payment-correlation.repository");
const payment_repository_1 = require("../repositories/payment.repository");
let PaymentCorrelationService = PaymentCorrelationService_1 = class PaymentCorrelationService {
    constructor(correlationRepo, paymentRepo, dataSource) {
        this.correlationRepo = correlationRepo;
        this.paymentRepo = paymentRepo;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(PaymentCorrelationService_1.name);
    }
    async createMapping(dto, tenantId, actorId) {
        const financePayment = await this.paymentRepo.findById(dto.financePaymentId, tenantId);
        if (!financePayment) {
            throw new common_1.BadRequestException(`Finance payment ${dto.financePaymentId} not found for tenant ${tenantId}`);
        }
        const bkPayRows = await this.dataSource.query(`SELECT id FROM booking_payments
       WHERE id = $1 AND tenant_id = $2 AND is_deleted = FALSE
       LIMIT 1`, [dto.bookingPaymentId, tenantId]);
        if (!bkPayRows.length) {
            throw new common_1.BadRequestException(`Booking payment ${dto.bookingPaymentId} not found for tenant ${tenantId}`);
        }
        const existingMappings = await this.correlationRepo.findByBookingPaymentId(dto.bookingPaymentId, tenantId);
        if (existingMappings.length > 0) {
            const exact = existingMappings.find((m) => m.financePaymentId === dto.financePaymentId);
            if (exact) {
                this.logger.debug(`createMapping: exact mapping ${exact.id} already exists — returning idempotent`);
                return exact;
            }
            throw new common_1.ConflictException(`Booking payment ${dto.bookingPaymentId} is already mapped to Finance payment ` +
                `${existingMappings[0].financePaymentId} (v1 invariant: one Booking payment → ` +
                `one Finance payment). Cannot add a second mapping.`);
        }
        const input = {
            bookingPaymentId: dto.bookingPaymentId,
            financePaymentId: dto.financePaymentId,
            correlationSource: dto.correlationSource,
            externalReference: dto.externalReference,
            metadata: dto.metadata ?? {},
        };
        try {
            const mapping = await this.correlationRepo.createMapping(input, tenantId, actorId);
            this.logger.log(`createMapping: ${mapping.id} ` +
                `bookingPayment=${dto.bookingPaymentId} ↔ financePayment=${dto.financePaymentId} ` +
                `source=${dto.correlationSource} — tenant ${tenantId}`);
            return mapping;
        }
        catch (err) {
            const msg = err.message ?? '';
            if (msg.includes('uq_bpfpm_booking_payment') ||
                (err.code === '23505' && msg.includes('booking_payment_id'))) {
                const existing = await this.correlationRepo.findByBookingPaymentId(dto.bookingPaymentId, tenantId);
                if (existing.length > 0 && existing[0].financePaymentId === dto.financePaymentId) {
                    return existing[0];
                }
                throw new common_1.ConflictException(`Concurrent mapping conflict for Booking payment ${dto.bookingPaymentId}. ` +
                    `It is already mapped to a different Finance payment.`);
            }
            throw err;
        }
    }
    async findByBookingPaymentId(bookingPaymentId, tenantId) {
        return this.correlationRepo.findByBookingPaymentId(bookingPaymentId, tenantId);
    }
    async findByFinancePaymentId(financePaymentId, tenantId) {
        return this.correlationRepo.findByFinancePaymentId(financePaymentId, tenantId);
    }
};
exports.PaymentCorrelationService = PaymentCorrelationService;
exports.PaymentCorrelationService = PaymentCorrelationService = PaymentCorrelationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [payment_correlation_repository_1.PaymentCorrelationRepository,
        payment_repository_1.PaymentRepository,
        typeorm_2.DataSource])
], PaymentCorrelationService);
//# sourceMappingURL=payment-correlation.service.js.map