import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

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
import { BookingSchedulerService }  from './services/booking-scheduler.service';
import { BookingController }        from './controllers/booking.controller';
import { SlotModule }               from '../slot/slot.module';
import { CourtModule }              from '../court/court.module';
import { VenueModule }              from '../venue/venue.module';
import { PricingModule }            from '../pricing/pricing.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingPaymentEntity,
      BookingRefundEntity,
      BookingLogEntity,
    ]),
    PricingModule,   // re-exports SlotModule — provides SlotRepository + PricingService
    CourtModule,
    VenueModule,
  ],
  controllers: [BookingController],
  providers: [
    BookingRepository,
    BookingPaymentRepository,
    BookingRefundRepository,
    BookingLogRepository,
    BookingValidationService,
    BookingService,
    BookingSchedulerService,
  ],
  exports: [BookingService, BookingValidationService, BookingRepository, BookingLogRepository],
})
export class BookingModule {}
