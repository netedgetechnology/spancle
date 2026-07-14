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
   * Returns due jobs (pending or retry, nextAttemptAt <= NOW())
   * in ascending nextAttemptAt order (oldest first).
   */
  async findDueJobs(
    tenantId?: string,
    limit = 20,
  ): Promise<FinanceBookingRefundJobEntity[]> {
    const qb = this.repo
      .createQueryBuilder('j')
      .where("j.status IN ('pending', 'retry')")
      .andWhere('j.nextAttemptAt <= NOW()')
      .orderBy('j.nextAttemptAt', 'ASC')
      .take(limit);
    if (tenantId) qb.andWhere('j.tenantId = :tenantId', { tenantId });
    return qb.getMany();
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
