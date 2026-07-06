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
var BookingRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const booking_entity_1 = require("../entities/booking.entity");
let BookingRepository = BookingRepository_1 = class BookingRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(BookingRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(booking_entity_1.BookingEntity); }
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
        return this.scopedQb('b', tenantId).andWhere('b.id = :id', { id }).getOne();
    }
    async findByIdOrFail(id, tenantId) {
        const b = await this.findById(id, tenantId);
        if (!b)
            throw new common_1.NotFoundException(`Booking ${id} not found`);
        return b;
    }
    async findByReference(reference, tenantId) {
        return this.scopedQb('b', tenantId)
            .andWhere('b.reference = :reference', { reference })
            .getOne();
    }
    async query(params) {
        const qb = this.scopedQb('b', params.tenantId)
            .orderBy('b.startsAt', 'DESC');
        if (params.branchId)
            qb.andWhere('b.branchId = :branchId', { branchId: params.branchId });
        if (params.courtId)
            qb.andWhere('b.courtId = :courtId', { courtId: params.courtId });
        if (params.sportId)
            qb.andWhere('b.sportId = :sportId', { sportId: params.sportId });
        if (params.userId)
            qb.andWhere('b.userId = :userId', { userId: params.userId });
        if (params.status)
            qb.andWhere('b.status = :status', { status: params.status });
        if (params.reference)
            qb.andWhere('b.reference = :reference', { reference: params.reference });
        if (params.from)
            qb.andWhere('b.startsAt >= :from', { from: params.from });
        if (params.to)
            qb.andWhere('b.startsAt < :to', { to: params.to });
        if (params.limit)
            qb.take(params.limit);
        if (params.offset)
            qb.skip(params.offset);
        return qb.getMany();
    }
    async updateById(id, tenantId, data) {
        await this.repo.update({ id, tenantId }, { ...data, updatedAt: new Date() });
        return this.repo.findOneOrFail({ where: { id, tenantId } });
    }
    async softDelete(id, tenantId) {
        await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date(), updatedAt: new Date() });
    }
    async countByStatus(tenantId) {
        const rows = await this.scopedQb('b', tenantId)
            .select('b.status', 'status')
            .addSelect('COUNT(b.id)::int', 'count')
            .groupBy('b.status')
            .getRawMany();
        const counts = {
            reserved: 0, pending_payment: 0, confirmed: 0,
            checked_in: 0, in_progress: 0, completed: 0,
            cancelled: 0, no_show: 0, refunded: 0,
            rescheduled: 0, expired: 0,
        };
        for (const r of rows)
            counts[r.status] = Number(r.count);
        return counts;
    }
    async findConfirmedOverlapping(params) {
        const qb = this.scopedQb('b', params.tenantId)
            .andWhere('b.courtId = :courtId', { courtId: params.courtId })
            .andWhere("b.status IN ('pending_payment','confirmed')")
            .andWhere('b.startsAt < :endsAt', { endsAt: params.endsAt })
            .andWhere('b.endsAt > :startsAt', { startsAt: params.startsAt });
        if (params.excludeId)
            qb.andWhere('b.id != :excludeId', { excludeId: params.excludeId });
        return qb.getMany();
    }
    async findByUserInRange(params) {
        return this.scopedQb('b', params.tenantId)
            .andWhere('b.userId = :userId', { userId: params.userId })
            .andWhere('b.courtId = :courtId', { courtId: params.courtId })
            .andWhere("b.status IN ('pending_payment','confirmed')")
            .andWhere('b.startsAt >= :from', { from: params.from })
            .andWhere('b.startsAt < :to', { to: params.to })
            .getMany();
    }
    async findExpiredReservations(batchSize = 50) {
        return this.dataSource.getRepository(booking_entity_1.BookingEntity)
            .createQueryBuilder('b')
            .where("b.status IN ('reserved','pending_payment')")
            .andWhere('b.expiresAt < :now', { now: new Date() })
            .andWhere('b.isDeleted = false')
            .orderBy('b.expiresAt', 'ASC')
            .take(batchSize)
            .getMany();
    }
    async findPastConfirmed(tenantId, before, batchSize = 50) {
        return this.scopedQb('b', tenantId)
            .andWhere("b.status = 'confirmed'")
            .andWhere('b.endsAt < :before', { before })
            .take(batchSize)
            .getMany();
    }
    async findStartedConfirmed(tenantId, batchSize = 50) {
        return this.scopedQb('b', tenantId)
            .andWhere("b.status = 'confirmed'")
            .andWhere('b.startsAt <= :now', { now: new Date() })
            .andWhere('b.endsAt > :now2', { now2: new Date() })
            .take(batchSize)
            .getMany();
    }
    async findNoShowCandidates(tenantId, gracePeriodMinutes = 30, batchSize = 50) {
        const cutoff = new Date(Date.now() - gracePeriodMinutes * 60_000);
        return this.scopedQb('b', tenantId)
            .andWhere("b.status = 'confirmed'")
            .andWhere('b.startsAt < :cutoff', { cutoff })
            .andWhere('b.checkedInAt IS NULL')
            .take(batchSize)
            .getMany();
    }
};
exports.BookingRepository = BookingRepository;
exports.BookingRepository = BookingRepository = BookingRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], BookingRepository);
//# sourceMappingURL=booking.repository.js.map