import { Module } from '@nestjs/common';
import { SlotModule } from '../slot/slot.module';

/**
 * PricingModule — independent pricing domain.
 *
 * Exposes PricingService to any module that imports PricingModule.
 * The implementation lives in SlotModule (which owns the DB entities and
 * repositories for PricingRuleEntity, RateCardEntity, HolidayEntity).
 *
 * Consumers (Booking, POS, Academy, Tournament, Membership) import
 * PricingModule rather than SlotModule, enforcing the dependency boundary:
 *
 *   PricingModule → SlotModule (internal)
 *   BookingModule → PricingModule (not SlotModule directly)
 *   AcademyModule → PricingModule
 *   PosModule     → PricingModule
 *
 * This means PricingService can be extracted to its own NestJS application
 * in the future by replacing this module's imports with HTTP or gRPC client
 * adapters — Booking and other consumers change nothing.
 */
@Module({
  imports:  [SlotModule],
  exports:  [SlotModule],   // re-exports PricingService + RateCardService from SlotModule
})
export class PricingModule {}
