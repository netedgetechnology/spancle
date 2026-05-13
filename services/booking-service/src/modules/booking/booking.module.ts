import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule }    from '@nestjs/axios';

import { BookingEntity }         from './entities/booking.entity';
import { BookingPaymentEntity }  from './entities/booking-payment.entity';
import { BookingRefundEntity }   from './entities/booking-refund.entity';
import { BookingLogEntity }      from './entities/booking-log.entity';

import { BookingRepository } from './repositories/booking.repository';
import {
  BookingPaymentRepository,
  BookingRefundRepository,
  BookingLogRepository,
} from './repositories/booking-support.repository';

import { BookingService }           from './services/booking.service';
import { BookingValidationService } from './services/booking-validation.service';
import { BookingController }        from './controllers/booking.controller';
import { SlotModule }               from '../slot/slot.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingPaymentEntity,
      BookingRefundEntity,
      BookingLogEntity,
    ]),
    HttpModule.register({ timeout: 5_000, maxRedirects: 0 }),
    SlotModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingRepository,
    BookingPaymentRepository,
    BookingRefundRepository,
    BookingLogRepository,
    BookingValidationService,
    BookingService,
  ],
  exports: [BookingService, BookingValidationService],
})
export class BookingModule {}
