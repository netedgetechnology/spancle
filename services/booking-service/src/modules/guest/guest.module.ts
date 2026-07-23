import { Module, forwardRef } from '@nestjs/common';
import { GuestSessionService }          from './guest-session.service';
import { GuestBookingLinkingService }   from './guest-booking-linking.service';
import { GuestController }              from './guest.controller';
import { BookingModule }                from '../booking/booking.module';
import { QrModule }                     from '../qr/qr.module';

@Module({
  imports: [
    forwardRef(() => BookingModule),
    forwardRef(() => QrModule),
  ],
  controllers: [GuestController],
  providers:   [GuestSessionService, GuestBookingLinkingService],
  exports:     [GuestSessionService, GuestBookingLinkingService],
})
export class GuestModule {}
