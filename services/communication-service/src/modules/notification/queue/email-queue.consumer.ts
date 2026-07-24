import { Inject }                            from '@nestjs/common';
import { CorrelationLogger }                from '../../../common/logging/correlation-logger';
import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
/** Minimal Job shape from BullMQ/Bull — avoids direct 'bull' peer dep import. */
interface EmailJob {
  id:           string | number;
  data:         EmailJobData;
  attemptsMade: number;
}
import { NotificationRepository }            from '../repositories/notification.repository';
import { TemplateRenderer }                  from '../../template/services/template-renderer.service';
import {
  EmailProvider,
  EMAIL_PROVIDER,
} from '../../email/interfaces/email-provider.interface';
import {
  EMAIL_QUEUE,
  EMAIL_JOB_SEND,
  type EmailJobData,
} from './email-queue.constants';

/**
 * EmailQueueConsumer
 *
 * Processes jobs from the BullMQ 'email' queue.
 *
 * Consumer flow:
 *   1. Mark NotificationEntity status='processing'
 *   2. TemplateRenderer.resolve() → rendered subject, bodyHtml, bodyText
 *   3. EmailProvider.send() → delivery attempt
 *   4a. Success → markDelivered() (status='delivered', providerRef, sentAt)
 *   4b. Failure → markAttemptFailed() + rethrow → BullMQ retries the job
 *
 * After all attempts are exhausted BullMQ calls @OnQueueFailed, which
 * then marks the NotificationEntity status='failed'.
 *
 * Retry policy is set by EmailQueueProducer (attempts=3, exponential backoff).
 * The consumer only needs to rethrow on failure — BullMQ handles retries.
 *
 * Template not found:
 *   If TemplateRenderer returns null, the job fails permanently (no retry)
 *   because retrying without a template would always fail.
 */
@Processor(EMAIL_QUEUE)
export class EmailQueueConsumer {
  private readonly log = new CorrelationLogger(EmailQueueConsumer.name);

  constructor(
    private readonly notificationRepo: NotificationRepository,
    private readonly templateRenderer:  TemplateRenderer,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider:     EmailProvider,
  ) {}

  @Process(EMAIL_JOB_SEND)
  async handleSendEmail(job: EmailJob): Promise<void> {
    const { notificationId, tenantId, recipientEmail, templateSlug, locale, variables } = job.data;

    this.log.debug('Processing email job', { notificationId, queueJobId: String(job.id), tenantId, templateSlug, recipientEmail });

    // 1. Mark as processing
    await this.notificationRepo.markProcessing(notificationId);

    // 2. Render template
    const rendered = await this.templateRenderer.resolve(
      { tenantId, slug: templateSlug, channel: 'email', locale },
      variables,
    );

    if (!rendered) {
      const msg = `Template not found — slug=${templateSlug} locale=${locale} tenant=${tenantId}`;
      this.log.error(msg, undefined, { notificationId, queueJobId: String(job.id), tenantId, templateSlug });
      await this.notificationRepo.markFailed(notificationId, msg);
      // Do NOT rethrow — a missing template is a permanent failure, not retryable
      return;
    }

    // 3. Send via EmailProvider
    const result = await this.emailProvider.send({
      to:      recipientEmail,
      subject: rendered.subject ?? `${templateSlug}`,
      html:    rendered.bodyHtml ?? undefined,
      text:    rendered.bodyText ?? undefined,
    });

    // 4a. Success
    if (result.success) {
      await this.notificationRepo.markDelivered(notificationId, result.messageId ?? null);
      this.log.info(`Email delivered — messageId=${result.messageId ?? 'none'}`, { notificationId, queueJobId: String(job.id), tenantId, templateSlug, recipientEmail });
      return;
    }

    // 4b. Delivery failure — record attempt and rethrow so BullMQ retries
    const error = result.error ?? 'Unknown delivery error';
    await this.notificationRepo.markAttemptFailed(notificationId, error);

    this.log.warn(`Email delivery attempt failed (attempt ${job.attemptsMade + 1}) — ${error}`, { notificationId, queueJobId: String(job.id), tenantId, templateSlug, recipientEmail });

    throw new Error(error);   // BullMQ catches this and re-queues if attempts remain
  }

  /**
   * @OnQueueFailed — called by BullMQ after ALL retry attempts are exhausted.
   * Marks the notification permanently failed.
   */
  @OnQueueFailed()
  async onFailed(job: EmailJob, err: Error): Promise<void> {
    const { notificationId } = job.data;
    this.log.error(`Email job permanently failed — attempts=${job.attemptsMade}`, err, { notificationId, queueJobId: String(job.id) });
    await this.notificationRepo.markFailed(notificationId, err.message);
  }
}
