import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource }     from '@nestjs/typeorm';
import { DataSource }           from 'typeorm';
import { FinanceBookingRefundJobRepository } from '../repositories/finance-booking-refund-job.repository';
import { PaymentCorrelationRepository }     from '../repositories/payment-correlation.repository';
import { InvoiceRepository }               from '../repositories/invoice.repository';
import { RefundService }                   from './refund.service';
import { FinanceBookingRefundJobEntity }   from '../entities/finance-booking-refund-job.entity';

// ── Lease configuration ───────────────────────────────────────────────────────

/**
 * Processing lease duration in seconds.
 * A job in 'processing' state is considered stale (reclaimable) when:
 *   started_at <= NOW() - leaseDurationSeconds
 *
 * Configurable via FINANCE_BOOKING_REFUND_JOB_LEASE_SECONDS (default: 600).
 * Invalid / zero / negative / NaN / non-integer values fall back to 600.
 */
function parseLeaseDurationSeconds(): number {
  const raw    = process.env['FINANCE_BOOKING_REFUND_JOB_LEASE_SECONDS'];
  if (!raw) return 600;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed <= 0) return 600;
  return parsed;
}

const LEASE_DURATION_SECONDS = parseLeaseDurationSeconds();

function staleBefore(): Date {
  return new Date(Date.now() - LEASE_DURATION_SECONDS * 1000);
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ProcessSource = 'scheduler' | 'admin';

interface EnqueueInput {
  tenantId:        string;
  bookingRefundId: string;
  bookingId:       string;
  amountMinor:     number;
  currency:        string;
  actorId?:        string;
}

interface RefundPlanItem {
  bookingPaymentId:     string;
  financePaymentId:     string;
  invoiceId:            string;
  allocationMinor:      number;
  callerIdempotencyKey: string;   // bkref_<bookingRefundId>_<bookingPaymentId>
}

const JOB_BATCH_SIZE = 20;

/**
 * FinanceBookingRefundJobService — durable Booking→Finance refund orchestrator.
 *
 * Architecture:
 *   1. onBookingRefunded listener calls enqueueBookingRefund() → creates one job per event.
 *   2. @Cron every minute calls processDueJobs() → processJob(id, tenantId, 'scheduler').
 *   3. processJob() claims/reclaims the job under FOR UPDATE, builds the refund plan,
 *      and executes RefundService.requestRefund() for each allocation.
 *   4. Each requestRefund() call is idempotent via callerIdempotencyKey.
 *   5. Failed attempts set status='retry' with exponential backoff.
 *   6. Stale processing jobs (started_at older than lease) are reclaimed.
 *
 * Lease duration: FINANCE_BOOKING_REFUND_JOB_LEASE_SECONDS (default 600s = 10min).
 *
 * Booking refund job completion semantics:
 *   The job is completed when every Finance refund allocation has entered Finance's
 *   committed refund workflow (status='processing' or 'completed'). Final cash
 *   disbursement (Finance status='completed' via completeRefund()) may complete
 *   asynchronously and is NOT awaited by this job.
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

  async enqueueBookingRefund(input: EnqueueInput): Promise<FinanceBookingRefundJobEntity> {
    return this.jobRepo.createOrFindJob(input);
  }

  // ── Scheduler ─────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE, { name: 'finance:booking_refund_jobs' })
  async processDueJobs(): Promise<void> {
    try {
      const jobs = await this.jobRepo.findDueJobs(staleBefore(), undefined, JOB_BATCH_SIZE);
      if (!jobs.length) return;
      this.logger.log(`[cron] Processing ${jobs.length} booking-refund job(s)`);
      for (const job of jobs) {
        try {
          await this.processJob(job.id, job.tenantId, 'scheduler');
        } catch (err) {
          this.logger.error(
            `[cron] job ${job.id} threw: ${(err as Error).message}`,
          );
        }
      }
    } catch (err) {
      this.logger.error(
        `[cron] sweep error: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  // ── Process a single job ──────────────────────────────────────────────────

  /**
   * source='scheduler': silently no-ops for fresh processing jobs.
   * source='admin':     throws ConflictException for fresh processing jobs,
   *                     so the admin knows a retry was NOT performed.
   */
  async processJob(
    jobId:   string,
    tenantId: string,
    source:   ProcessSource = 'scheduler',
  ): Promise<FinanceBookingRefundJobEntity> {

    // ── Phase A: Claim or reclaim (short tx) ─────────────────────────────
    const { job: lockedJob, proceed, isConflict } = await this.dataSource.transaction(
      async (manager) => this.jobRepo.claimOrReclaim(
        jobId, tenantId, staleBefore(), source === 'admin', manager,
      ),
    );

    if (isConflict) {
      // admin source hits a fresh processing job
      throw new ConflictException(
        `Job ${jobId} is currently being processed by another worker. ` +
        `It cannot be manually retried until the processing lease expires ` +
        `(${LEASE_DURATION_SECONDS}s from when it was last claimed). ` +
        `started_at=${lockedJob.startedAt?.toISOString() ?? 'null'}`,
      );
    }
    if (!proceed) {
      return lockedJob;   // completed, or scheduler no-ops for fresh processing
    }

    const job = await this.jobRepo.findByIdOrFail(jobId, tenantId);  // read fresh after claim

    // ── Phase B: Build complete plan ─────────────────────────────────────
    let plan: RefundPlanItem[];
    try {
      plan = await this.buildRefundPlan(job);
    } catch (err) {
      await this.markJobRetry(jobId, tenantId, job.attemptCount, err as Error);
      return this.jobRepo.findByIdOrFail(jobId, tenantId);
    }

    // ── Phase C: Execute plan items sequentially (idempotent via callerKey) ─
    //
    // Booking refund job completion means all allocations have entered Finance's
    // committed refund workflow (status='processing' or 'completed').
    // Final cash disbursement (completeRefund() → status='completed') may
    // complete asynchronously and is NOT waited for here.
    try {
      for (const item of plan) {
        const refund = await this.refundService.requestRefund(
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

        // Explicit convergence check: only 'processing' or 'completed' count
        if (refund.status !== 'processing' && refund.status !== 'completed') {
          throw new Error(
            `Finance refund ${refund.id} for bookingPaymentId=${item.bookingPaymentId} ` +
            `is in status="${refund.status}" which is not a committed workflow state. ` +
            `Expected: processing or completed. ` +
            `For status="rejected": admin intervention required (callerKey=${item.callerIdempotencyKey}).`,
          );
        }
      }

      // All allocations converged — mark job completed
      await this.dataSource.transaction(async (manager) => {
        const locked = await this.jobRepo.lockById(jobId, tenantId, manager);
        if (locked && locked.status !== 'completed') {
          await this.jobRepo.markCompleted(jobId, tenantId, manager);
        }
      });

      this.logger.log(
        `processJob [${source}]: job ${jobId} completed — ` +
        `${plan.length} Finance refund(s) for bookingRefundId=${job.bookingRefundId} — tenant ${tenantId}`,
      );
    } catch (err) {
      await this.markJobRetry(jobId, tenantId, job.attemptCount, err as Error);
    }

    return this.jobRepo.findByIdOrFail(jobId, tenantId);
  }

  // ── Plan builder ──────────────────────────────────────────────────────────

  private async buildRefundPlan(job: FinanceBookingRefundJobEntity): Promise<RefundPlanItem[]> {
    const { tenantId, bookingRefundId, bookingId, amountMinor } = job;

    const ref = await this.invoiceRepo.findReference('booking', bookingId, tenantId);
    if (!ref) {
      throw new Error(
        `No Finance invoice for booking ${bookingId} — create invoice first`,
      );
    }

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
      throw new Error(`No booking_refund_payment_allocations for bookingRefundId=${bookingRefundId}`);
    }

    const allocSum = allocRows.reduce((s, r) => s + r.amount_minor, 0);
    if (allocSum !== amountMinor) {
      throw new Error(
        `Allocation sum ${allocSum} ≠ job amountMinor ${amountMinor} — invariant violation`,
      );
    }

    const plan: RefundPlanItem[] = [];
    for (const alloc of allocRows) {
      const bookingPaymentId = alloc.booking_payment_id;
      const mappings = await this.correlationRepo.findByBookingPaymentId(bookingPaymentId, tenantId);
      if (!mappings.length) {
        throw new Error(
          `No Finance payment correlation for bookingPaymentId=${bookingPaymentId} ` +
          `tenantId=${tenantId}. Create via POST /finance/admin/payment-correlations.`,
        );
      }
      if (mappings.length > 1) {
        throw new Error(
          `Multiple Finance payment correlations (${mappings.length}) for ` +
          `bookingPaymentId=${bookingPaymentId} — invariant violation`,
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
    this.logger.warn(`processJob: job ${jobId} failed attempt ${attemptCount} — ${safeMsg}`);
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
