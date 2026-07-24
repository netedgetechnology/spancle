import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource }       from 'typeorm';
import { InjectQueue }      from '@nestjs/bull';

/** Minimal Queue interface for job counts — avoids direct 'bull' peer dep. */
interface BullQueueCounts {
  getJobCounts(): Promise<{
    waiting:   number;
    active:    number;
    completed: number;
    failed:    number;
    delayed:   number;
    paused:    number;
  }>;
}

export interface QueueMetrics {
  /** Counts from the notifications table (persistent, survives restarts). */
  db: {
    queued:     number;
    processing: number;
    delivered:  number;
    failed:     number;
    total:      number;
  };
  /** Counts from BullMQ (ephemeral — current state of the live queue). */
  queue: {
    waiting:   number;
    active:    number;
    completed: number;
    failed:    number;
    delayed:   number;
  };
  /** ISO timestamp of when metrics were collected. */
  collectedAt: string;
}

/**
 * QueueMetricsService
 *
 * Aggregates delivery metrics from two sources:
 *   db    — notification entity status counts (durable, cross-restart)
 *   queue — BullMQ live job counts (ephemeral, current queue depth)
 *
 * The DB counts are the authoritative delivery record.
 * The queue counts show the current processing backlog.
 */
@Injectable()
export class QueueMetricsService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    @InjectQueue('email') private readonly emailQueue: BullQueueCounts,
  ) {}

  async getMetrics(): Promise<QueueMetrics> {
    const [dbCounts, queueCounts] = await Promise.all([
      this.getDbCounts(),
      this.getQueueCounts(),
    ]);

    return {
      db:          dbCounts,
      queue:       queueCounts,
      collectedAt: new Date().toISOString(),
    };
  }

  private async getDbCounts(): Promise<QueueMetrics['db']> {
    const rows = await this.ds.query<{ status: string; count: string }[]>(`
      SELECT status, COUNT(*)::int AS count
      FROM notifications
      WHERE is_deleted = FALSE
      GROUP BY status
    `);

    const map: Record<string, number> = {};
    for (const row of rows) map[row.status] = Number(row.count);

    const queued     = map['queued']     ?? 0;
    const processing = map['processing'] ?? 0;
    const delivered  = map['delivered']  ?? 0;
    const failed     = map['failed']     ?? 0;

    return {
      queued,
      processing,
      delivered,
      failed,
      total: queued + processing + delivered + failed,
    };
  }

  private async getQueueCounts(): Promise<QueueMetrics['queue']> {
    try {
      const counts = await this.emailQueue.getJobCounts();
      return {
        waiting:   counts.waiting   ?? 0,
        active:    counts.active    ?? 0,
        completed: counts.completed ?? 0,
        failed:    counts.failed    ?? 0,
        delayed:   counts.delayed   ?? 0,
      };
    } catch {
      // Queue unavailable (Redis down) — return zeros rather than failing the endpoint
      return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
    }
  }
}
