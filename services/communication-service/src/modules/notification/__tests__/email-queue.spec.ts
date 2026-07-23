/**
 * email-queue.spec.ts
 *
 * Unit tests for EmailQueueProducer and EmailQueueConsumer.
 *
 * Strategy:
 *   - BullMQ Queue is stubbed with a mock object.
 *   - NotificationRepository is stubbed (no DB connection).
 *   - TemplateRenderer.resolve() is a jest.fn().
 *   - EmailProvider.send() is a jest.fn().
 *
 * Covers:
 *   Producer:
 *     ✓ creates a NotificationEntity and enqueues a job
 *     ✓ stores queue job ID on the entity
 *     ✓ uses locale default 'en'
 *     ✓ returns notificationId
 *
 *   Consumer — success path:
 *     ✓ marks processing → delivered
 *     ✓ stores providerRef on delivery
 *     ✓ does not throw on success
 *
 *   Consumer — template not found:
 *     ✓ marks notification permanently failed
 *     ✓ does NOT rethrow (no retry for missing template)
 *
 *   Consumer — provider failure:
 *     ✓ increments retryCount (markAttemptFailed)
 *     ✓ rethrows so BullMQ retries
 *
 *   Consumer — onFailed (all attempts exhausted):
 *     ✓ marks notification permanently failed with error message
 *
 *   Retry policy:
 *     ✓ job is enqueued with attempts=3 and exponential backoff
 */

import { EmailQueueProducer }  from '../queue/email-queue.producer';
import { EmailQueueConsumer }  from '../queue/email-queue.consumer';
import { EMAIL_JOB_SEND }      from '../queue/email-queue.constants';
import type { NotificationRepository } from '../repositories/notification.repository';
import type { TemplateRenderer }       from '../../template/services/template-renderer.service';
import type { EmailProvider }          from '../../email/interfaces/email-provider.interface';
interface EmailJob { id: string | number; data: EmailJobData; attemptsMade: number; }
import type { EmailJobData }           from '../queue/email-queue.constants';

// ── Stub builders ─────────────────────────────────────────────────────────────

function makeNotificationRepo(overrides: Partial<NotificationRepository> = {}): jest.Mocked<NotificationRepository> {
  return {
    create:            jest.fn().mockResolvedValue({ id: 'notif-id-001', status: 'queued' }),
    findAllByTenant:   jest.fn(),
    findByIdAndTenant: jest.fn(),
    update:            jest.fn(),
    softDelete:        jest.fn(),
    markProcessing:    jest.fn().mockResolvedValue(undefined),
    markDelivered:     jest.fn().mockResolvedValue(undefined),
    markAttemptFailed: jest.fn().mockResolvedValue(undefined),
    markFailed:        jest.fn().mockResolvedValue(undefined),
    setQueueJobId:     jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<NotificationRepository>;
}

function makeBullQueue() {
  return {
    add: jest.fn().mockResolvedValue({ id: 'job-id-42' }),
  };
}

function makeTemplateRenderer(renderedOverride?: Partial<{
  subject: string; bodyHtml: string; bodyText: string;
}> | null): jest.Mocked<Pick<TemplateRenderer, 'resolve' | 'renderString'>> {
  const resolved = renderedOverride !== null ? {
    subject:          renderedOverride?.subject    ?? 'Your booking is confirmed',
    bodyHtml:         renderedOverride?.bodyHtml   ?? '<p>Hi!</p>',
    bodyText:         renderedOverride?.bodyText   ?? 'Hi!',
    resolvedSlug:     'booking_confirmed_email',
    resolvedLocale:   'en',
    resolvedTenantId: 'system',
  } : null;
  return {
    resolve:      jest.fn().mockResolvedValue(resolved),
    renderString: jest.fn().mockImplementation((s: string) => s),
  } as jest.Mocked<Pick<TemplateRenderer, 'resolve' | 'renderString'>>;
}

function makeEmailProvider(sendResult: { success: boolean; messageId?: string; error?: string }) {
  return {
    send: jest.fn().mockResolvedValue(sendResult),
  } as unknown as jest.Mocked<EmailProvider>;
}

function makeJob(data: Partial<EmailJobData> = {}, attemptsMade = 0): EmailJob {
  return {
    id:           'job-id-42',
    attemptsMade,
    data: {
      notificationId: 'notif-id-001',
      tenantId:       'tenant-uuid-001',
      recipientEmail: 'user@example.com',
      templateSlug:   'booking_confirmed_email',
      locale:         'en',
      variables:      { customer: { name: 'Alice' } },
      channel:        'email',
      ...data,
    },
  } as unknown as EmailJob;
}

// ── Producer tests ────────────────────────────────────────────────────────────

describe('EmailQueueProducer', () => {
  let repo:     ReturnType<typeof makeNotificationRepo>;
  let queue:    ReturnType<typeof makeBullQueue>;
  let producer: EmailQueueProducer;

  beforeEach(() => {
    repo  = makeNotificationRepo();
    queue = makeBullQueue();
    producer = new EmailQueueProducer(queue as never, repo as never);
  });

  it('creates a NotificationEntity with status=queued', async () => {
    await producer.enqueue({
      tenantId:      'tenant-001',
      recipientEmail: 'a@b.com',
      templateSlug:  'booking_confirmed_email',
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({
      status:  'queued',
      channel: 'email',
    }));
  });

  it('enqueues a job with EMAIL_JOB_SEND name', async () => {
    await producer.enqueue({
      tenantId:      'tenant-001',
      recipientEmail: 'a@b.com',
      templateSlug:  'booking_confirmed_email',
    });
    expect(queue.add).toHaveBeenCalledWith(EMAIL_JOB_SEND, expect.any(Object), expect.any(Object));
  });

  it('enqueues with attempts=3 and exponential backoff', async () => {
    await producer.enqueue({
      tenantId:      'tenant-001',
      recipientEmail: 'a@b.com',
      templateSlug:  'booking_confirmed_email',
    });
    const [, , opts] = queue.add.mock.calls[0] as [string, unknown, { attempts: number; backoff: { type: string } }];
    expect(opts.attempts).toBe(3);
    expect(opts.backoff.type).toBe('exponential');
  });

  it('stores queue job ID on the notification', async () => {
    await producer.enqueue({
      tenantId:      'tenant-001',
      recipientEmail: 'a@b.com',
      templateSlug:  'booking_confirmed_email',
    });
    expect(repo.setQueueJobId).toHaveBeenCalledWith('notif-id-001', 'job-id-42');
  });

  it('defaults locale to "en" when not provided', async () => {
    await producer.enqueue({
      tenantId:      'tenant-001',
      recipientEmail: 'a@b.com',
      templateSlug:  'booking_confirmed_email',
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ locale: 'en' }));
  });

  it('returns the notificationId', async () => {
    const id = await producer.enqueue({
      tenantId:      'tenant-001',
      recipientEmail: 'a@b.com',
      templateSlug:  'booking_confirmed_email',
    });
    expect(id).toBe('notif-id-001');
  });
});

// ── Consumer tests ────────────────────────────────────────────────────────────

describe('EmailQueueConsumer', () => {
  let repo:     ReturnType<typeof makeNotificationRepo>;
  let renderer: ReturnType<typeof makeTemplateRenderer>;
  let provider: jest.Mocked<EmailProvider>;
  let consumer: EmailQueueConsumer;

  function makeConsumer() {
    return new EmailQueueConsumer(repo as never, renderer as never, provider);
  }

  beforeEach(() => {
    repo     = makeNotificationRepo();
    renderer = makeTemplateRenderer();
    provider = makeEmailProvider({ success: true, messageId: '<abc@host>' });
    consumer = makeConsumer();
  });

  describe('success path', () => {
    it('marks notification as processing', async () => {
      await consumer.handleSendEmail(makeJob());
      expect(repo.markProcessing).toHaveBeenCalledWith('notif-id-001');
    });

    it('calls TemplateRenderer.resolve with correct params', async () => {
      const job = makeJob({ tenantId: 't-001', templateSlug: 'booking_confirmed_email', locale: 'fr' });
      await consumer.handleSendEmail(job);
      expect(renderer.resolve).toHaveBeenCalledWith(
        { tenantId: 't-001', slug: 'booking_confirmed_email', channel: 'email', locale: 'fr' },
        expect.any(Object),
      );
    });

    it('calls EmailProvider.send with rendered subject, html, text', async () => {
      await consumer.handleSendEmail(makeJob());
      expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
        to:      'user@example.com',
        subject: 'Your booking is confirmed',
        html:    '<p>Hi!</p>',
        text:    'Hi!',
      }));
    });

    it('marks notification as delivered with providerRef', async () => {
      await consumer.handleSendEmail(makeJob());
      expect(repo.markDelivered).toHaveBeenCalledWith('notif-id-001', '<abc@host>');
    });

    it('does not throw on success', async () => {
      await expect(consumer.handleSendEmail(makeJob())).resolves.toBeUndefined();
    });
  });

  describe('template not found', () => {
    beforeEach(() => {
      renderer = makeTemplateRenderer(null);  // returns null = not found
      consumer = makeConsumer();
    });

    it('marks notification permanently failed', async () => {
      await consumer.handleSendEmail(makeJob());
      expect(repo.markFailed).toHaveBeenCalledWith('notif-id-001', expect.stringContaining('Template not found'));
    });

    it('does NOT rethrow (no retry for missing template)', async () => {
      await expect(consumer.handleSendEmail(makeJob())).resolves.toBeUndefined();
    });

    it('does not call EmailProvider.send', async () => {
      await consumer.handleSendEmail(makeJob());
      expect(provider.send).not.toHaveBeenCalled();
    });
  });

  describe('provider delivery failure', () => {
    beforeEach(() => {
      provider = makeEmailProvider({ success: false, error: 'Connection timeout' });
      consumer = makeConsumer();
    });

    it('records failed attempt (markAttemptFailed)', async () => {
      await expect(consumer.handleSendEmail(makeJob())).rejects.toThrow('Connection timeout');
      expect(repo.markAttemptFailed).toHaveBeenCalledWith('notif-id-001', 'Connection timeout');
    });

    it('rethrows the error so BullMQ retries the job', async () => {
      await expect(consumer.handleSendEmail(makeJob())).rejects.toThrow('Connection timeout');
    });

    it('does not call markDelivered on failure', async () => {
      await expect(consumer.handleSendEmail(makeJob())).rejects.toThrow();
      expect(repo.markDelivered).not.toHaveBeenCalled();
    });
  });

  describe('onFailed (all attempts exhausted)', () => {
    it('marks notification permanently failed with error message', async () => {
      const job = makeJob({}, 3);
      await consumer.onFailed(job, new Error('Max retries exceeded'));
      expect(repo.markFailed).toHaveBeenCalledWith('notif-id-001', 'Max retries exceeded');
    });
  });
});
