import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue }        from '@nestjs/bull';
/** Minimal Queue shape — avoids direct 'bull' peer dep import. */
interface BullQueue<T> {
  add(name: string, data: T, opts?: Record<string, unknown>): Promise<{ id: string | number }>;
}
import { NotificationRepository } from '../repositories/notification.repository';
import {
  EMAIL_QUEUE,
  EMAIL_JOB_SEND,
  type EmailJobData,
} from './email-queue.constants';

/** Input to enqueue a single email notification. */
export interface EnqueueEmailInput {
  tenantId:      string;
  recipientEmail: string;
  templateSlug:  string;
  locale?:       string;
  variables?:    Record<string, unknown>;
  /** Human-readable label for the NotificationEntity.name column. */
  name?:         string;
}

/**
 * EmailQueueProducer
 *
 * Creates a NotificationEntity (status='queued') and enqueues a BullMQ
 * job that the EmailQueueConsumer will process.
 *
 * Calling code never touches the queue directly — it calls enqueue() only.
 *
 * Retry policy (configured on the job):
 *   attempts:    3  (1 initial + 2 retries)
 *   backoff:     exponential, starting at 5 000 ms
 *   removeOnComplete: 100 (keep last 100 completed jobs for debugging)
 *   removeOnFail:     false (keep all failed jobs for inspection)
 */
@Injectable()
export class EmailQueueProducer {
  private readonly logger = new Logger(EmailQueueProducer.name);

  constructor(
    @InjectQueue(EMAIL_QUEUE)
    private readonly queue: BullQueue<EmailJobData>,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  /**
   * enqueue()
   *
   * 1. Creates a NotificationEntity (status='queued').
   * 2. Adds a job to the BullMQ email queue.
   * 3. Stores the job ID on the entity for traceability.
   *
   * @returns The created NotificationEntity id.
   */
  async enqueue(input: EnqueueEmailInput): Promise<string> {
    const locale = input.locale ?? 'en';

    // Create notification record first — if queue.add() fails, we have the record
    const notification = await this.notificationRepo.create({
      tenantId:      input.tenantId,
      name:          input.name ?? `${input.templateSlug} → ${input.recipientEmail}`,
      channel:       'email',
      recipientEmail: input.recipientEmail,
      templateSlug:  input.templateSlug,
      locale,
      variables:     input.variables ?? {},
      status:        'queued',
      retryCount:    0,
    });

    const jobData: EmailJobData = {
      notificationId: notification.id,
      tenantId:       input.tenantId,
      recipientEmail: input.recipientEmail,
      templateSlug:   input.templateSlug,
      locale,
      variables:      input.variables ?? {},
      channel:        'email',
    };

    const job = await this.queue.add(EMAIL_JOB_SEND, jobData, {
      attempts:  3,
      backoff:   { type: 'exponential', delay: 5_000 },
      removeOnComplete: 100,
      removeOnFail:     false,
    });

    // Store job ID for traceability
    await this.notificationRepo.setQueueJobId(notification.id, String(job.id));

    this.logger.log(
      `Email enqueued — notificationId=${notification.id} ` +
      `jobId=${job.id} tenant=${input.tenantId} ` +
      `template=${input.templateSlug} to=${input.recipientEmail}`,
    );

    return notification.id;
  }
}
