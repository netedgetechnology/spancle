import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookingEntity }         from './entities/booking.entity';
import { BookingPaymentEntity }  from './entities/booking-payment.entity';
import { BookingRefundEntity }   from './entities/booking-refund.entity';
import { BookingRefundPaymentAllocationEntity } from './entities/booking-refund-payment-allocation.entity';
import { BookingLogEntity }      from './entities/booking-log.entity';

import { BookingRepository } from './repositories/booking.repository';
import {
  BookingPaymentRepository,
  BookingRefundRepository,
  BookingLogRepository,
} from './repositories/booking-support.repository';

import { BookingService }              from './services/booking.service';
import { BookingValidationService }    from './services/booking-validation.service';
import { BookingSchedulerService }     from './services/booking-scheduler.service';
import { BookingAuthorizationService } from './services/booking-authorization.service';
import { BookingController }           from './controllers/booking.controller';
import { SlotModule }               from '../slot/slot.module';
import { CourtModule }              from '../court/court.module';
import { VenueModule }              from '../venue/venue.module';
import { PricingModule }            from '../pricing/pricing.module';

// Forward-reference to avoid circular dependency: BookingModule → QrModule → BookingModule
// QrModule imports BookingModule for BookingRepository/Service.
// BookingModule imports QrModule for QrGenerationService (consumer QR endpoint only).
// NestJS forwardRef() breaks the cycle.
import { forwardRef }               from '@nestjs/common';
import { QrModule }                 from '../qr/qr.module';
import { BookingRulesModule }       from '../booking-rules/booking-rules.module';
import { CustomerModule }          from '../customer/customer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingPaymentEntity,
      BookingRefundEntity,
      BookingRefundPaymentAllocationEntity,
      BookingLogEntity,
    ]),
    PricingModule,   // re-exports SlotModule — provides SlotRepository + PricingService
    CourtModule,
    VenueModule,
    forwardRef(() => QrModule),   // consumer QR endpoint — breaks BookingModule↔QrModule cycle
    BookingRulesModule,              // provides BookingRulesService for rule enforcement
    CustomerModule,                  // provides CustomerService for customer resolution
  ],
  controllers: [BookingController],
  providers: [
    BookingRepository,
    BookingPaymentRepository,
    BookingRefundRepository,
    BookingLogRepository,
    BookingValidationService,
    BookingAuthorizationService,
    BookingService,
    BookingSchedulerService,
  ],
  exports: [BookingService, BookingValidationService, BookingAuthorizationService, BookingRepository, BookingLogRepository],
})
export class BookingModule {}
