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
var BookingPaymentRepository_1, BookingRefundRepository_1, BookingLogRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingLogRepository = exports.BookingRefundRepository = exports.BookingPaymentRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_payment_entity_1 = require("../entities/booking-payment.entity");
const booking_refund_entity_1 = require("../entities/booking-refund.entity");
const booking_log_entity_1 = require("../entities/booking-log.entity");
// ── Payment repository ─────────────────────────────────────────────────────
let BookingPaymentRepository = BookingPaymentRepository_1 = class BookingPaymentRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BookingPaymentRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(booking_payment_entity_1.BookingPaymentEntity); }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async findByIdOrFail(id, tenantId) {
        const p = await this.findById(id, tenantId);
        if (!p)
            throw new Error(`BookingPayment ${id} not found`);
        return p;
    }
    async findByBooking(bookingId, tenantId) {
        return this.repo
            .createQueryBuilder('p')
            .where('p.tenantId = :tenantId', { tenantId })
            .andWhere('p.bookingId = :bookingId', { bookingId })
            .andWhere('p.isDeleted = false')
            .orderBy('p.createdAt', 'ASC')
            .getMany();
    }
    /**
     * Returns the most recent paid payment for a booking.
     * Used by refund service to validate refund amount.
     */
    async findPaidPayment(bookingId, tenantId) {
        return this.repo
            .createQueryBuilder('p')
            .where('p.tenantId = :tenantId', { tenantId })
            .andWhere('p.bookingId = :bookingId', { bookingId })
            .andWhere("p.status = 'paid'")
            .andWhere('p.isDeleted = false')
            .orderBy('p.createdAt', 'DESC')
            .getOne();
    }
    async findByIdempotencyKey(key, tenantId) {
        return this.repo.findOne({
            where: { idempotencyKey: key, tenantId, isDeleted: false },
        });
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async sumPaidForBooking(bookingId, tenantId) {
        const result = await this.repo
            .createQueryBuilder('p')
            .select('COALESCE(SUM(p.amountMinor), 0)::int', 'total')
            .where('p.tenantId = :tenantId', { tenantId })
            .andWhere('p.bookingId = :bookingId', { bookingId })
            .andWhere("p.status = 'paid'")
            .andWhere('p.isDeleted = false')
            .getRawOne();
        return Number(result?.total ?? 0);
    }
};
exports.BookingPaymentRepository = BookingPaymentRepository;
exports.BookingPaymentRepository = BookingPaymentRepository = BookingPaymentRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BookingPaymentRepository);
// ── Refund repository ──────────────────────────────────────────────────────
let BookingRefundRepository = BookingRefundRepository_1 = class BookingRefundRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BookingRefundRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(booking_refund_entity_1.BookingRefundEntity); }
    async create(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
    }
    async findByIdOrFail(id, tenantId) {
        const r = await this.findById(id, tenantId);
        if (!r)
            throw new Error(`BookingRefund ${id} not found`);
        return r;
    }
    async findByBooking(bookingId, tenantId) {
        return this.repo
            .createQueryBuilder('r')
            .where('r.tenantId = :tenantId', { tenantId })
            .andWhere('r.bookingId = :bookingId', { bookingId })
            .andWhere('r.isDeleted = false')
            .orderBy('r.createdAt', 'DESC')
            .getMany();
    }
    async findByPayment(paymentId, tenantId) {
        return this.repo
            .createQueryBuilder('r')
            .where('r.tenantId = :tenantId', { tenantId })
            .andWhere('r.paymentId = :paymentId', { paymentId })
            .andWhere('r.isDeleted = false')
            .getMany();
    }
    async sumProcessedForPayment(paymentId, tenantId) {
        const result = await this.repo
            .createQueryBuilder('r')
            .select('COALESCE(SUM(r.amountMinor), 0)::int', 'total')
            .where('r.tenantId = :tenantId', { tenantId })
            .andWhere('r.paymentId = :paymentId', { paymentId })
            .andWhere("r.status = 'processed'")
            .andWhere('r.isDeleted = false')
            .getRawOne();
        return Number(result?.total ?? 0);
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
};
exports.BookingRefundRepository = BookingRefundRepository;
exports.BookingRefundRepository = BookingRefundRepository = BookingRefundRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BookingRefundRepository);
// ── Log repository ─────────────────────────────────────────────────────────
let BookingLogRepository = BookingLogRepository_1 = class BookingLogRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BookingLogRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(booking_log_entity_1.BookingLogEntity); }
    /** INSERT only — no update or delete operations exposed */
    async insert(data) {
        return this.repo.save(this.repo.create(data));
    }
    async findByBooking(bookingId, tenantId) {
        return this.repo
            .createQueryBuilder('l')
            .where('l.tenantId = :tenantId', { tenantId })
            .andWhere('l.bookingId = :bookingId', { bookingId })
            .orderBy('l.createdAt', 'ASC')
            .getMany();
    }
    async findByAction(tenantId, action, from, to) {
        const qb = this.repo
            .createQueryBuilder('l')
            .where('l.tenantId = :tenantId', { tenantId })
            .andWhere('l.action = :action', { action })
            .orderBy('l.createdAt', 'DESC');
        if (from)
            qb.andWhere('l.createdAt >= :from', { from });
        if (to)
            qb.andWhere('l.createdAt < :to', { to });
        return qb.getMany();
    }
};
exports.BookingLogRepository = BookingLogRepository;
exports.BookingLogRepository = BookingLogRepository = BookingLogRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BookingLogRepository);
//# sourceMappingURL=booking-support.repository.js.map