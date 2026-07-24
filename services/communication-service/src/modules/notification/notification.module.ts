import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService }    from './services/notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { BookingEventListener }   from './listeners/booking-event.listener';
import { NotificationEntity }     from './entities/notification.entity';
import { EmailQueueProducer }     from './queue/email-queue.producer';
import { EmailQueueConsumer }     from './queue/email-queue.consumer';
import { EMAIL_QUEUE }            from './queue/email-queue.constants';
import { TemplateModule }         from '../template/template.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationEntity]),
    BullModule.registerQueue({ name: EMAIL_QUEUE }),
    TemplateModule,
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    NotificationRepository,
    BookingEventListener,
    EmailQueueProducer,
    EmailQueueConsumer,
  ],
  exports: [NotificationService, EmailQueueProducer],
})
export class NotificationModule {}
