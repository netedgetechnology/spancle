/**
 * TypeORM DataSource — communication-service
 * Used by: typeorm migration:run, migration:revert, migration:generate
 */

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { MessageEntity } from './modules/message/entities/message.entity';
import { NotificationPreferenceEntity } from './modules/notification/entities/notification-preference.entity';
import { AddNotificationPreferencesAndTemplates1722000004000 } from './migrations/1722000004000-AddNotificationPreferencesAndTemplates';
import { NotificationEntity } from './modules/notification/entities/notification.entity';
import { TemplateEntity } from './modules/template/entities/template.entity';

import { AddTemplateFields1722000001000 }            from './migrations/1722000001000-AddTemplateFields';
import { AddNotificationDeliveryFields1722000002000 } from './migrations/1722000002000-AddNotificationDeliveryFields';
import { SeedBookingCancelledTemplate1722000003000 }   from './migrations/1722000003000-SeedBookingCancelledTemplate';

const dataSource = new DataSource({
  type:               'postgres',
  url:                process.env['DATABASE_URL']!,
  entities:           [
    MessageEntity,
    NotificationEntity,
    NotificationPreferenceEntity,
    TemplateEntity,
  ],
  migrations:         [AddTemplateFields1722000001000, AddNotificationDeliveryFields1722000002000, SeedBookingCancelledTemplate1722000003000, AddNotificationPreferencesAndTemplates1722000004000],
  migrationsTableName: 'typeorm_migrations',
  synchronize:        false,
  logging:            ['error', 'migration'],
  ssl: process.env['DATABASE_SSL'] === 'true'
    ? { rejectUnauthorized: process.env['DATABASE_SSL_REJECT_UNAUTHORIZED'] !== 'false' }
    : false,
});

export default dataSource;
