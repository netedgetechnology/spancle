import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource }     from '@nestjs/typeorm';
import { DataSource }           from 'typeorm';
import { FinanceBookingRefundJobRepository } from '../repositories/finance-booking-refund-job.repository';
import { PaymentCorrelationRepository }     from '../repositories/payment-correlation.repository';
import { InvoiceRepository }               from '../repositories/invoice.repository';
import { RefundService }                   from './refund.service';
import { FinanceBookingRefundJobEntity }   from '../entities/finance-booking-refund-job.entity';

interface EnqueueInput {
  tenantId:        string;
  bookingRefundId: string;
  bookingId:       string;
  amountMinor:     number;
  currency:        string;
  actorId?:        string;
}

interface RefundPlanItem {
  bookingPaymentId: string;
  financePaymentId: string;
  invoiceId:        string;
  allocationMinor:  number;
  callerIdempotencyKey: string;   // bkref_<bookingRefundId>_<bookingPaymentId>
}

const JOB_BATCH_SIZE = 20;

/**
 * FinanceBookingRefundJobService — processes durable Finance refund jobs.
 *
 * Architecture:
 *   1. BookingFinanceListener.onBookingRefunded() calls enqueueBookingRefund().
 *   2. enqueueBookingRefund() creates (or finds existing) a FinanceBookingRefundJobEntity.
 *   3. @Cron every minute calls processDueJobs() → processJob() for each due job.
 *   4. processJob() rebuilds the Finance refund plan from:
 *        booking_refund_payment_allocations + booking_payment_finance_payment_map
 *      then calls RefundService.requestRefund() for each allocation using
 *      a stable callerIdempotencyKey = bkref_<bookingRefundId>_<bookingPaymentId>.
 *   5. If any allocation fails, the job is marked retry with exponential backoff.
 *   6. Replay is idempotent: completed allocations return existing Finance refunds.
 */
@Injectable()
export class FinanceBookingRefundJobService {
  private readonly logger = new Logger(FinanceBookingRefundJobService.name);

  constructor(
    private readonly jobRepo:         FinanceBookingRefundJobRepository,
    private readonly correlationRepo: PaymentCorrelationRepository,
    private readonly invoiceRepo:     InvoiceRepository,
    private readonly refundService:   RefundService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  // ── Enqueue ───────────────────────────────────────────────────────────────

  /**
   * Creates or finds a durable job for the given booking refund event.
   * Idempotent: duplicate BOOKING_REFUNDED events create one job only.
   */
  async enqueueBookingRefund(input: EnqueueInput): Promise<FinanceBookingRefundJobEntity> {
    return this.jobRepo.createOrFindJob(input);
  }

  // ── Scheduler ─────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE, { name: 'finance:booking_refund_jobs' })
  async processDueJobs(): Promise<void> {
    try {
      const jobs = await this.jobRepo.findDueJobs(undefined, JOB_BATCH_SIZE);
      if (!jobs.length) return;
      this.logger.log(`[cron:booking_refund_jobs] Processing ${jobs.length} job(s)`);
      for (const job of jobs) {
        try {
          await this.processJob(job.id, job.tenantId);
        } catch (err) {
          // Individual job failures are isolated — sweep continues
          this.logger.error(
            `[cron:booking_refund_jobs] job ${job.id} threw: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `[cron:booking_refund_jobs] sweep error: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  // ── Process a single job ──────────────────────────────────────────────────

  async processJob(jobId: string, tenantId: string): Promise<FinanceBookingRefundJobEntity> {
    // ── Phase A: Claim (short tx) ─────────────────────────────────────────
    let job: FinanceBookingRefundJobEntity;

    const claimed = await this.dataSource.transaction(async (manager) => {
      const locked = await this.jobRepo.lockById(jobId, tenantId, manager);
      if (!locked) throw new Error(`Job ${jobId} not found`);

      if (locked.status === 'completed') {
        return { job: locked, proceed: false };
      }
      if (locked.status === 'processing') {
        // Another instance is already processing — skip
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
    if (!claimed.proceed) return job;

    // ── Phase B: Build complete plan (outside tx — read-only) ─────────────
    let plan: RefundPlanItem[];
    try {
      plan = await this.buildRefundPlan(job);
    } catch (err) {
      await this.markJobRetry(jobId, tenantId, job.attemptCount + 1, err as Error);
      return this.jobRepo.findByIdOrFail(jobId, tenantId);
    }

    // ── Phase C: Execute plan items sequentially (idempotent via callerKey) ─
    try {
      for (const item of plan) {
        await this.refundService.requestRefund(
          {
            paymentId:      item.financePaymentId,
            invoiceId:      item.invoiceId,
            amountMinor:    item.allocationMinor,
            currency:       job.currency,
            idempotencyKey: item.callerIdempotencyKey,
            sourceType:     'booking',
            sourceId:       job.bookingId,
          },
          tenantId,
          job.actorId ?? 'system',
        );
      }

      // All allocations succeeded — mark completed
      await this.dataSource.transaction(async (manager) => {
        const locked = await this.jobRepo.lockById(jobId, tenantId, manager);
        if (locked && locked.status !== 'completed') {
          await this.jobRepo.markCompleted(jobId, tenantId, manager);
        }
      });

      this.logger.log(
        `processJob: job ${jobId} completed — ${plan.length} Finance refund(s) ` +
        `for bookingRefund=${job.bookingRefundId} — tenant ${tenantId}`,
      );
    } catch (err) {
      await this.markJobRetry(jobId, tenantId, job.attemptCount + 1, err as Error);
    }

    return this.jobRepo.findByIdOrFail(jobId, tenantId);
  }

  // ── Plan builder ──────────────────────────────────────────────────────────

  private async buildRefundPlan(job: FinanceBookingRefundJobEntity): Promise<RefundPlanItem[]> {
    const { tenantId, bookingRefundId, bookingId, amountMinor } = job;

    // Resolve Finance invoice for this booking
    const ref = await this.invoiceRepo.findReference('booking', bookingId, tenantId);
    if (!ref) {
      throw new Error(
        `No Finance invoice found for booking ${bookingId} — ` +
        `create an invoice before processing the refund job`,
      );
    }

    // Load booking refund payment allocations
    const allocRows = await this.dataSource.query<{
      booking_payment_id: string;
      amount_minor:       number;
    }[]>(
      `SELECT booking_payment_id, amount_minor
       FROM booking_refund_payment_allocations
       WHERE tenant_id = $1 AND booking_refund_id = $2
       ORDER BY booking_payment_id ASC`,
      [tenantId, bookingRefundId],
    );

    if (!allocRows.length) {
      throw new Error(
        `No booking_refund_payment_allocations for bookingRefundId=${bookingRefundId}`,
      );
    }

    const allocSum = allocRows.reduce((s, r) => s + r.amount_minor, 0);
    if (allocSum !== amountMinor) {
      throw new Error(
        `Allocation sum ${allocSum} ≠ job amountMinor ${amountMinor} — invariant violation`,
      );
    }

    // Resolve correlation for EVERY allocation before returning any plan
    const plan: RefundPlanItem[] = [];
    for (const alloc of allocRows) {
      const bookingPaymentId = alloc.booking_payment_id;
      const mappings = await this.correlationRepo.findByBookingPaymentId(
        bookingPaymentId, tenantId,
      );
      if (!mappings.length) {
        throw new Error(
          `No Finance payment correlation for bookingPaymentId=${bookingPaymentId} ` +
          `tenantId=${tenantId}. ` +
          `Create via POST /finance/admin/payment-correlations before retrying.`,
        );
      }
      if (mappings.length > 1) {
        throw new Error(
          `Multiple Finance payment correlations (${mappings.length}) for ` +
          `bookingPaymentId=${bookingPaymentId} — invariant violation (migration 017 unique index)`,
        );
      }
      plan.push({
        bookingPaymentId,
        financePaymentId:    mappings[0]!.financePaymentId,
        invoiceId:           ref.invoiceId,
        allocationMinor:     alloc.amount_minor,
        callerIdempotencyKey: `bkref_${bookingRefundId}_${bookingPaymentId}`,
      });
    }
    return plan;
  }

  // ── Retry helper ──────────────────────────────────────────────────────────

  private async markJobRetry(
    jobId:        string,
    tenantId:     string,
    attemptCount: number,
    err:          Error,
  ): Promise<void> {
    const safeMsg = (err.message ?? 'unknown error').slice(0, 2000);
    this.logger.warn(
      `processJob: job ${jobId} failed attempt ${attemptCount} — ${safeMsg}`,
    );
    await this.dataSource.transaction(async (manager) => {
      const locked = await this.jobRepo.lockById(jobId, tenantId, manager);
      if (locked && locked.status !== 'completed') {
        await this.jobRepo.markRetry(jobId, tenantId, safeMsg, attemptCount, manager);
      }
    });
  }

  // ── Read paths ────────────────────────────────────────────────────────────

  async findById(id: string, tenantId: string): Promise<FinanceBookingRefundJobEntity> {
    return this.jobRepo.findByIdOrFail(id, tenantId);
  }

  async findByBookingRefundId(
    bookingRefundId: string,
    tenantId:        string,
  ): Promise<FinanceBookingRefundJobEntity | null> {
    return this.jobRepo.findByBookingRefundId(bookingRefundId, tenantId);
  }
}
