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
var FinanceBookingRefundJobService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceBookingRefundJobService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const finance_booking_refund_job_repository_1 = require("../repositories/finance-booking-refund-job.repository");
const payment_correlation_repository_1 = require("../repositories/payment-correlation.repository");
const invoice_repository_1 = require("../repositories/invoice.repository");
const refund_service_1 = require("./refund.service");
const JOB_BATCH_SIZE = 20;
let FinanceBookingRefundJobService = FinanceBookingRefundJobService_1 = class FinanceBookingRefundJobService {
    constructor(jobRepo, correlationRepo, invoiceRepo, refundService, dataSource) {
        this.jobRepo = jobRepo;
        this.correlationRepo = correlationRepo;
        this.invoiceRepo = invoiceRepo;
        this.refundService = refundService;
        this.dataSource = dataSource;
        this.logger = new common_1.Logger(FinanceBookingRefundJobService_1.name);
    }
    async enqueueBookingRefund(input) {
        return this.jobRepo.createOrFindJob(input);
    }
    async processDueJobs() {
        try {
            const jobs = await this.jobRepo.findDueJobs(undefined, JOB_BATCH_SIZE);
            if (!jobs.length)
                return;
            this.logger.log(`[cron:booking_refund_jobs] Processing ${jobs.length} job(s)`);
            for (const job of jobs) {
                try {
                    await this.processJob(job.id, job.tenantId);
                }
                catch (err) {
                    this.logger.error(`[cron:booking_refund_jobs] job ${job.id} threw: ${err.message}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[cron:booking_refund_jobs] sweep error: ${err.message}`, err.stack);
        }
    }
    async processJob(jobId, tenantId) {
        let job;
        const claimed = await this.dataSource.transaction(async (manager) => {
            const locked = await this.jobRepo.lockById(jobId, tenantId, manager);
            if (!locked)
                throw new Error(`Job ${jobId} not found`);
            if (locked.status === 'completed') {
                return { job: locked, proceed: false };
            }
            if (locked.status === 'processing') {
                this.logger.warn(`processJob: job ${jobId} already in processing — skipping`);
                return { job: locked, proceed: false };
            }
            if (locked.status !== 'pending' && locked.status !== 'retry') {
                return { job: locked, proceed: false };
            }
            await this.jobRepo.markProcessing(jobId, tenantId, manager);
            return { job: locked, proceed: true };
        });
        job = claimed.job;
        if (!claimed.proceed)
            return job;
        let plan;
        try {
            plan = await this.buildRefundPlan(job);
        }
        catch (err) {
            await this.markJobRetry(jobId, tenantId, job.attemptCount + 1, err);
            return this.jobRepo.findByIdOrFail(jobId, tenantId);
        }
        try {
            for (const item of plan) {
                await this.refundService.requestRefund({
                    paymentId: item.financePaymentId,
                    invoiceId: item.invoiceId,
                    amountMinor: item.allocationMinor,
                    currency: job.currency,
                    idempotencyKey: item.callerIdempotencyKey,
                    sourceType: 'booking',
                    sourceId: job.bookingId,
                }, tenantId, job.actorId ?? 'system');
            }
            await this.dataSource.transaction(async (manager) => {
                const locked = await this.jobRepo.lockById(jobId, tenantId, manager);
                if (locked && locked.status !== 'completed') {
                    await this.jobRepo.markCompleted(jobId, tenantId, manager);
                }
            });
            this.logger.log(`processJob: job ${jobId} completed — ${plan.length} Finance refund(s) ` +
                `for bookingRefund=${job.bookingRefundId} — tenant ${tenantId}`);
        }
        catch (err) {
            await this.markJobRetry(jobId, tenantId, job.attemptCount + 1, err);
        }
        return this.jobRepo.findByIdOrFail(jobId, tenantId);
    }
    async buildRefundPlan(job) {
        const { tenantId, bookingRefundId, bookingId, amountMinor } = job;
        const ref = await this.invoiceRepo.findReference('booking', bookingId, tenantId);
        if (!ref) {
            throw new Error(`No Finance invoice found for booking ${bookingId} — ` +
                `create an invoice before processing the refund job`);
        }
        const allocRows = await this.dataSource.query(`SELECT booking_payment_id, amount_minor
       FROM booking_refund_payment_allocations
       WHERE tenant_id = $1 AND booking_refund_id = $2
       ORDER BY booking_payment_id ASC`, [tenantId, bookingRefundId]);
        if (!allocRows.length) {
            throw new Error(`No booking_refund_payment_allocations for bookingRefundId=${bookingRefundId}`);
        }
        const allocSum = allocRows.reduce((s, r) => s + r.amount_minor, 0);
        if (allocSum !== amountMinor) {
            throw new Error(`Allocation sum ${allocSum} ≠ job amountMinor ${amountMinor} — invariant violation`);
        }
        const plan = [];
        for (const alloc of allocRows) {
            const bookingPaymentId = alloc.booking_payment_id;
            const mappings = await this.correlationRepo.findByBookingPaymentId(bookingPaymentId, tenantId);
            if (!mappings.length) {
                throw new Error(`No Finance payment correlation for bookingPaymentId=${bookingPaymentId} ` +
                    `tenantId=${tenantId}. ` +
                    `Create via POST /finance/admin/payment-correlations before retrying.`);
            }
            if (mappings.length > 1) {
                throw new Error(`Multiple Finance payment correlations (${mappings.length}) for ` +
                    `bookingPaymentId=${bookingPaymentId} — invariant violation (migration 017 unique index)`);
            }
            plan.push({
                bookingPaymentId,
                financePaymentId: mappings[0].financePaymentId,
                invoiceId: ref.invoiceId,
                allocationMinor: alloc.amount_minor,
                callerIdempotencyKey: `bkref_${bookingRefundId}_${bookingPaymentId}`,
            });
        }
        return plan;
    }
    async markJobRetry(jobId, tenantId, attemptCount, err) {
        const safeMsg = (err.message ?? 'unknown error').slice(0, 2000);
        this.logger.warn(`processJob: job ${jobId} failed attempt ${attemptCount} — ${safeMsg}`);
        await this.dataSource.transaction(async (manager) => {
            const locked = await this.jobRepo.lockById(jobId, tenantId, manager);
            if (locked && locked.status !== 'completed') {
                await this.jobRepo.markRetry(jobId, tenantId, safeMsg, attemptCount, manager);
            }
        });
    }
    async findById(id, tenantId) {
        return this.jobRepo.findByIdOrFail(id, tenantId);
    }
    async findByBookingRefundId(bookingRefundId, tenantId) {
        return this.jobRepo.findByBookingRefundId(bookingRefundId, tenantId);
    }
};
exports.FinanceBookingRefundJobService = FinanceBookingRefundJobService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE, { name: 'finance:booking_refund_jobs' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceBookingRefundJobService.prototype, "processDueJobs", null);
exports.FinanceBookingRefundJobService = FinanceBookingRefundJobService = FinanceBookingRefundJobService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(4, (0, typeorm_1.InjectDataSource)()),
    __metadata("design:paramtypes", [finance_booking_refund_job_repository_1.FinanceBookingRefundJobRepository,
        payment_correlation_repository_1.PaymentCorrelationRepository,
        invoice_repository_1.InvoiceRepository,
        refund_service_1.RefundService,
        typeorm_2.DataSource])
], FinanceBookingRefundJobService);
//# sourceMappingURL=finance-booking-refund-job.service.js.map