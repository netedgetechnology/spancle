import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { BookingEventListener }   from './listeners/booking-event.listener';
import { NotificationEntity } from './entities/notification.entity';

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
