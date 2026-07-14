import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource }          from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import {
  FinanceBookingRefundJobEntity,
  type BookingRefundJobStatus,
} from '../entities/finance-booking-refund-job.entity';

export interface CreateJobInput {
  tenantId:        string;
  bookingRefundId: string;
  bookingId:       string;
  amountMinor:     number;
  currency:        string;
  actorId?:        string;
}

@Injectable()
export class FinanceBookingRefundJobRepository {
  private readonly logger = new Logger(FinanceBookingRefundJobRepository.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  private get repo() { return this.dataSource.getRepository(FinanceBookingRefundJobEntity); }

  // ── Create ────────────────────────────────────────────────────────────────

  /**
   * Creates a new job or returns the existing one for the same
   * (tenantId, bookingRefundId) pair.
   * UNIQUE (tenant_id, booking_refund_id) is the DB-level dedup gate.
   */
  async createOrFindJob(input: CreateJobInput): Promise<FinanceBookingRefundJobEntity> {
    // Pre-check for normal idempotent path
    const existing = await this.findByBookingRefundId(input.bookingRefundId, input.tenantId);
    if (existing) {
      this.logger.debug(
        `createOrFindJob: existing job ${existing.id} for bookingRefundId=${input.bookingRefundId}`,
      );
      return existing;
    }

    const row = this.repo.create({
      tenantId:        input.tenantId,
      bookingRefundId: input.bookingRefundId,
      bookingId:       input.bookingId,
      amountMinor:     input.amountMinor,
      currency:        input.currency,
      actorId:         input.actorId ?? null,
      status:          'pending',
      nextAttemptAt:   new Date(),
    });

    try {
      return await this.repo.save(row);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (msg.includes('uq_finance_booking_refund_jobs_refund') ||
          ((err as any).code === '23505' && msg.includes('booking_refund_id'))) {
        // Concurrent race — load winner
        const winner = await this.findByBookingRefundId(input.bookingRefundId, input.tenantId);
        if (winner) return winner;
        throw new ConflictException(
          `Concurrent job creation conflict for bookingRefundId=${input.bookingRefundId}`,
        );
      }
      throw err;
    }
  }

  // ── Reads ─────────────────────────────────────────────────────────────────

  async findByBookingRefundId(
    bookingRefundId: string,
    tenantId:        string,
  ): Promise<FinanceBookingRefundJobEntity | null> {
    return this.repo.findOne({ where: { tenantId, bookingRefundId } });
  }

  async findById(id: string, tenantId: string): Promise<FinanceBookingRefundJobEntity | null> {
    return this.repo.findOne({ where: { id, tenantId } });
  }

  async findByIdOrFail(id: string, tenantId: string): Promise<FinanceBookingRefundJobEntity> {
    const j = await this.findById(id, tenantId);
    if (!j) throw new NotFoundException(`Booking refund job ${id} not found`);
    return j;
  }

  /**
   * Returns jobs that are due for processing:
   *   1. Normal due jobs: status IN ('pending','retry') AND next_attempt_at <= NOW()
   *   2. Stale processing jobs: status='processing' AND started_at <= staleBefore
   *      (process crashed after claiming but before completing)
   *
   * Both conditions are ORed. Jobs are returned in ascending nextAttemptAt order.
   * The stale/fresh decision is confirmed again under FOR UPDATE in claimOrReclaim().
   */
  async findDueJobs(
    leaseStaleBefore: Date,
    tenantId?: string,
    limit = 20,
  ): Promise<FinanceBookingRefundJobEntity[]> {
    const qb = this.repo
      .createQueryBuilder('j')
      .where(
        "(j.status IN ('pending', 'retry') AND j.nextAttemptAt <= NOW())" +
        ' OR ' +
        '(j.status = :processing AND j.startedAt IS NOT NULL AND j.startedAt <= :staleBefore)',
        { processing: 'processing', staleBefore: leaseStaleBefore },
      )
      .orderBy('j.nextAttemptAt', 'ASC')
      .take(limit);
    if (tenantId) qb.andWhere('j.tenantId = :tenantId', { tenantId });
    return qb.getMany();
  }

  /**
   * Atomically claims or reclaims a job inside a caller-supplied transaction.
   * Returns { proceed: true } if this worker owns the job.
   * Returns { proceed: false } if another worker owns it (fresh processing or completed).
   *
   * Stale/fresh decision is made under FOR UPDATE to prevent concurrent double-claim.
   */
  async claimOrReclaim(
    jobId:            string,
    tenantId:         string,
    leaseStaleBefore: Date,
    isAdmin:          boolean,
    manager:          EntityManager,
  ): Promise<{
    job:        FinanceBookingRefundJobEntity;
    proceed:    boolean;
    isConflict: boolean;  // true when admin hits a fresh processing job
  }> {
    const locked = await this.lockById(jobId, tenantId, manager);
    if (!locked) throw new Error(`Job ${jobId} not found`);

    if (locked.status === 'completed') {
      return { job: locked, proceed: false, isConflict: false };
    }

    if (locked.status === 'processing') {
      const isStale = locked.startedAt !== null && locked.startedAt <= leaseStaleBefore;
      if (isStale) {
        // Reclaim: reset startedAt + increment attemptCount
        await manager.update(FinanceBookingRefundJobEntity, { id: jobId, tenantId }, {
          status:       'processing',
          startedAt:    new Date(),
          attemptCount: () => 'attempt_count + 1',
          updatedAt:    new Date(),
        });
        return { job: locked, proceed: true, isConflict: false };
      }
      // Fresh processing: another worker owns this job
      return { job: locked, proceed: false, isConflict: isAdmin };
    }

    // pending or retry — normal claim
    if (locked.status === 'pending' || locked.status === 'retry') {
      await manager.update(FinanceBookingRefundJobEntity, { id: jobId, tenantId }, {
        status:       'processing',
        startedAt:    new Date(),
        attemptCount: () => 'attempt_count + 1',
        updatedAt:    new Date(),
      });
      return { job: locked, proceed: true, isConflict: false };
    }

    return { job: locked, proceed: false, isConflict: false };
  }

  // ── Locks ─────────────────────────────────────────────────────────────────

  /** Acquires a pessimistic write lock on the job row inside a caller transaction. */
  async lockById(
    id:       string,
    tenantId: string,
    manager:  EntityManager,
  ): Promise<FinanceBookingRefundJobEntity | null> {
    return manager
      .createQueryBuilder(FinanceBookingRefundJobEntity, 'j')
      .setLock('pessimistic_write')
      .where('j.id = :id', { id })
      .andWhere('j.tenantId = :tenantId', { tenantId })
      .getOne();
  }

  // ── Status transitions ────────────────────────────────────────────────────

  async markProcessing(
    id:       string,
    tenantId: string,
    manager:  EntityManager,
  ): Promise<void> {
    await manager.update(FinanceBookingRefundJobEntity, { id, tenantId }, {
      status:       'processing',
      startedAt:    new Date(),
      attemptCount: () => 'attempt_count + 1',
      updatedAt:    new Date(),
    });
  }

  async markRetry(
    id:           string,
    tenantId:     string,
    error:        string,
    attemptCount: number,
    manager:      EntityManager,
  ): Promise<void> {
    // Exponential backoff: min(3600, 30 * 2^(attemptCount-1)) seconds
    const delaySeconds = Math.min(3600, 30 * Math.pow(2, attemptCount - 1));
    const nextAttemptAt = new Date(Date.now() + delaySeconds * 1000);
    await manager.update(FinanceBookingRefundJobEntity, { id, tenantId }, {
      status:         'retry',
      lastError:      error.slice(0, 2000), // guard against oversized errors
      nextAttemptAt,
      updatedAt:      new Date(),
    });
  }

  async markCompleted(
    id:       string,
    tenantId: string,
    manager:  EntityManager,
  ): Promise<void> {
    await manager.update(FinanceBookingRefundJobEntity, { id, tenantId }, {
      status:      'completed',
      completedAt: new Date(),
      lastError:   null,
      updatedAt:   new Date(),
    });
  }
}
