import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository }   from '@nestjs/typeorm';
import type { Repository }    from 'typeorm';
import { NotificationEntity } from '../entities/notification.entity';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(
    @InjectRepository(NotificationEntity)
    private readonly repo: Repository<NotificationEntity>,
  ) {}

  async create(data: Partial<NotificationEntity>): Promise<NotificationEntity> {
    return this.repo.save(this.repo.create(data));
  }

  async findAllByTenant(tenantId: string): Promise<NotificationEntity[]> {
    return this.repo.find({ where: { tenantId, isDeleted: false } });
  }

  async findByIdAndTenant(id: string, tenantId: string): Promise<NotificationEntity | null> {
    return this.repo.findOne({ where: { id, tenantId, isDeleted: false } });
  }

  async update(id: string, tenantId: string, data: Partial<NotificationEntity>): Promise<NotificationEntity> {
    await this.repo.update({ id, tenantId }, data as object);
    return this.repo.findOneOrFail({ where: { id, tenantId } });
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { isDeleted: true, deletedAt: new Date() });
  }

  // ── Delivery status updates ───────────────────────────────────────────────

  /** Mark a notification as 'processing' when the worker picks it up. */
  async markProcessing(id: string): Promise<void> {
    await this.repo.update({ id }, { status: 'processing' });
  }

  /**
   * Mark a notification as 'delivered'.
   * Records providerRef (e.g. messageId) and sentAt timestamp.
   */
  async markDelivered(id: string, providerRef: string | null): Promise<void> {
    await this.repo.update({ id }, {
      status:      'delivered',
      providerRef,
      sentAt:      new Date(),
      errorMessage: null,
    });
  }

  /**
   * Record a failed delivery attempt.
   * Increments retryCount and stores the error message.
   * Does NOT set status to 'failed' — the consumer decides that once
   * all attempts are exhausted.
   */
  async markAttemptFailed(id: string, error: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({
        retryCount:   () => 'retry_count + 1',
        errorMessage: error,
      })
      .where('id = :id', { id })
      .execute();
  }

  /**
   * Mark a notification as permanently 'failed' (all attempts exhausted).
   */
  async markFailed(id: string, error: string): Promise<void> {
    await this.repo.update({ id }, {
      status:       'failed',
      errorMessage: error,
      failedAt:     new Date(),
    });
  }

  /** Store the BullMQ job ID after enqueuing. */
  async setQueueJobId(id: string, jobId: string): Promise<void> {
    await this.repo.update({ id }, { queueJobId: jobId });
  }
}
