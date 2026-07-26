import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository }   from 'typeorm';
import { NotificationPreferenceEntity } from '../entities/notification-preference.entity';

@Injectable()
export class NotificationPreferenceRepository {
  constructor(
    @InjectRepository(NotificationPreferenceEntity)
    private readonly repo: Repository<NotificationPreferenceEntity>,
  ) {}

  async findByUserAndType(
    userId:           string,
    tenantId:         string,
    notificationType: string,
  ): Promise<NotificationPreferenceEntity | null> {
    return this.repo.findOne({ where: { userId, tenantId, notificationType } });
  }

  async findAllByUser(
    userId:   string,
    tenantId: string,
  ): Promise<NotificationPreferenceEntity[]> {
    return this.repo.find({ where: { userId, tenantId }, order: { notificationType: 'ASC' } });
  }

  async upsert(data: {
    userId:           string;
    tenantId:         string;
    notificationType: string;
    enableEmail:      boolean;
    enableSms:        boolean;
    enablePush:       boolean;
    enableInApp:      boolean;
  }): Promise<NotificationPreferenceEntity> {
    const existing = await this.findByUserAndType(data.userId, data.tenantId, data.notificationType);
    if (existing) {
      await this.repo.update({ id: existing.id }, {
        enableEmail: data.enableEmail,
        enableSms:   data.enableSms,
        enablePush:  data.enablePush,
        enableInApp: data.enableInApp,
      });
      return this.repo.findOneOrFail({ where: { id: existing.id } });
    }
    return this.repo.save(this.repo.create(data));
  }

  /**
   * isEmailEnabled()
   *
   * Returns true if the user has NOT opted out of email for this notification type.
   * When no preference row exists → default is enabled (true).
   */
  async isEmailEnabled(
    userId:           string,
    tenantId:         string,
    notificationType: string,
  ): Promise<boolean> {
    if (!userId) return true;
    const pref = await this.findByUserAndType(userId, tenantId, notificationType);
    return pref?.enableEmail ?? true;
  }
}
