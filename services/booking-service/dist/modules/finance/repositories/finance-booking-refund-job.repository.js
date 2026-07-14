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
var FinanceBookingRefundJobRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceBookingRefundJobRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const finance_booking_refund_job_entity_1 = require("../entities/finance-booking-refund-job.entity");
let FinanceBookingRefundJobRepository = FinanceBookingRefundJobRepository_1 = class FinanceBookingRefundJobRepository {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(FinanceBookingRefundJobRepository_1.name);
    }
    get repo() { return this.dataSource.getRepository(finance_booking_refund_job_entity_1.FinanceBookingRefundJobEntity); }
    async createOrFindJob(input) {
        const existing = await this.findByBookingRefundId(input.bookingRefundId, input.tenantId);
        if (existing) {
            this.logger.debug(`createOrFindJob: existing job ${existing.id} for bookingRefundId=${input.bookingRefundId}`);
            return existing;
        }
        const row = this.repo.create({
            tenantId: input.tenantId,
            bookingRefundId: input.bookingRefundId,
            bookingId: input.bookingId,
            amountMinor: input.amountMinor,
            currency: input.currency,
            actorId: input.actorId ?? null,
            status: 'pending',
            nextAttemptAt: new Date(),
        });
        try {
            return await this.repo.save(row);
        }
        catch (err) {
            const msg = err.message ?? '';
            if (msg.includes('uq_finance_booking_refund_jobs_refund') ||
                (err.code === '23505' && msg.includes('booking_refund_id'))) {
                const winner = await this.findByBookingRefundId(input.bookingRefundId, input.tenantId);
                if (winner)
                    return winner;
                throw new common_1.ConflictException(`Concurrent job creation conflict for bookingRefundId=${input.bookingRefundId}`);
            }
            throw err;
        }
    }
    async findByBookingRefundId(bookingRefundId, tenantId) {
        return this.repo.findOne({ where: { tenantId, bookingRefundId } });
    }
    async findById(id, tenantId) {
        return this.repo.findOne({ where: { id, tenantId } });
    }
    async findByIdOrFail(id, tenantId) {
        const j = await this.findById(id, tenantId);
        if (!j)
            throw new common_1.NotFoundException(`Booking refund job ${id} not found`);
        return j;
    }
    async findDueJobs(leaseStaleBefore, tenantId, limit = 20) {
        const qb = this.repo
            .createQueryBuilder('j')
            .where("(j.status IN ('pending', 'retry') AND j.nextAttemptAt <= NOW())" +
            ' OR ' +
            '(j.status = :processing AND j.startedAt IS NOT NULL AND j.startedAt <= :staleBefore)', { processing: 'processing', staleBefore: leaseStaleBefore })
            .orderBy('j.nextAttemptAt', 'ASC')
            .take(limit);
        if (tenantId)
            qb.andWhere('j.tenantId = :tenantId', { tenantId });
        return qb.getMany();
    }
    async claimOrReclaim(jobId, tenantId, leaseStaleBefore, isAdmin, manager) {
        const locked = await this.lockById(jobId, tenantId, manager);
        if (!locked)
            throw new Error(`Job ${jobId} not found`);
        if (locked.status === 'completed') {
            return { job: locked, proceed: false, isConflict: false };
        }
        if (locked.status === 'processing') {
            const isStale = locked.startedAt !== null && locked.startedAt <= leaseStaleBefore;
            if (isStale) {
                await manager.update(finance_booking_refund_job_entity_1.FinanceBookingRefundJobEntity, { id: jobId, tenantId }, {
                    status: 'processing',
                    startedAt: new Date(),
                    attemptCount: () => 'attempt_count + 1',
                    updatedAt: new Date(),
                });
                return { job: locked, proceed: true, isConflict: false };
            }
            return { job: locked, proceed: false, isConflict: isAdmin };
        }
        if (locked.status === 'pending' || locked.status === 'retry') {
            await manager.update(finance_booking_refund_job_entity_1.FinanceBookingRefundJobEntity, { id: jobId, tenantId }, {
                status: 'processing',
                startedAt: new Date(),
                attemptCount: () => 'attempt_count + 1',
                updatedAt: new Date(),
            });
            return { job: locked, proceed: true, isConflict: false };
        }
        return { job: locked, proceed: false, isConflict: false };
    }
    async lockById(id, tenantId, manager) {
        return manager
            .createQueryBuilder(finance_booking_refund_job_entity_1.FinanceBookingRefundJobEntity, 'j')
            .setLock('pessimistic_write')
            .where('j.id = :id', { id })
            .andWhere('j.tenantId = :tenantId', { tenantId })
            .getOne();
    }
    async markProcessing(id, tenantId, manager) {
        await manager.update(finance_booking_refund_job_entity_1.FinanceBookingRefundJobEntity, { id, tenantId }, {
            status: 'processing',
            startedAt: new Date(),
            attemptCount: () => 'attempt_count + 1',
            updatedAt: new Date(),
        });
    }
    async markRetry(id, tenantId, error, attemptCount, manager) {
        const delaySeconds = Math.min(3600, 30 * Math.pow(2, attemptCount - 1));
        const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);
        await manager.update(finance_booking_refund_job_entity_1.FinanceBookingRefundJobEntity, { id, tenantId }, {
            status: 'retry',
            lastError: error.slice(0, 2000),
            nextAttemptAt,
            updatedAt: new Date(),
        });
    }
    async markCompleted(id, tenantId, manager) {
        await manager.update(finance_booking_refund_job_entity_1.FinanceBookingRefundJobEntity, { id, tenantId }, {
            status: 'completed',
            completedAt: new Date(),
            lastError: null,
            updatedAt: new Date(),
        });
    }
};
exports.FinanceBookingRefundJobRepository = FinanceBookingRefundJobRepository;
exports.FinanceBookingRefundJobRepository = FinanceBookingRefundJobRepository = FinanceBookingRefundJobRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [typeorm_2.DataSource])
], FinanceBookingRefundJobRepository);
//# sourceMappingURL=finance-booking-refund-job.repository.js.map