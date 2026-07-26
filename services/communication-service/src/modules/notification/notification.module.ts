import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService }    from './services/notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { NotificationPreferenceRepository } from './repositories/notification-preference.repository';
import { BookingEventListener }   from './listeners/booking-event.listener';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { NotificationEntity }     from './entities/notification.entity';
import { NotificationPreferenceEntity } from './entities/notification-preference.entity';
import { EmailQueueProducer }     from './queue/email-queue.producer';
import { EmailQueueConsumer }     from './queue/email-queue.consumer';
import { EMAIL_QUEUE }            from './queue/email-queue.constants';
import { TemplateModule }         from '../template/template.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity, NotificationPreferenceEntity]),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    TemplateModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationPreferenceRepository,
    BookingEventListener,
    NotificationSchedulerService,
    EmailQueueProducer,
    EmailQueueConsumer,
  ],
  exports: [NotificationService, EmailQueueProducer, NotificationPreferenceRepository],
})
export class NotificationModule {}
