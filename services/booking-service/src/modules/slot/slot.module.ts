import { Module }     from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { SlotEntity }         from './entities/slot.entity';
import { SlotTemplateEntity } from './entities/slot-template.entity';
import { PricingRuleEntity }  from './entities/pricing-rule.entity';
import { BlackoutEntity }     from './entities/blackout.entity';
import { RateCardEntity }     from './entities/rate-card.entity';
import { RateCardRepository } from './repositories/rate-card.repository';
import { RateCardService }    from './services/rate-card.service';
import { RateCardController } from './controllers/rate-card.controller';
import { HolidayEntity }      from './entities/holiday.entity';

// Repositories
import { SlotRepository }         from './repositories/slot.repository';
import { SlotTemplateRepository } from './repositories/slot-template.repository';
import { PricingRuleRepository }  from './repositories/pricing-rule.repository';
import { BlackoutRepository }     from './repositories/blackout.repository';
import { HolidayRepository }      from './repositories/holiday.repository';

// Services
import { SlotService }                    from './services/slot.service';
import { SlotGeneratorService }          from './services/slot-generator.service';
import { PricingService }                from './services/pricing.service';
import { PricingRuleValidationService }  from './services/pricing-rule-validation.service';
import { AvailabilityService }           from './services/availability.service';
import { HolidayService }                from './services/holiday.service';

// Controllers
import { SlotController }         from './controllers/slot.controller';
import { SlotTemplateController } from './controllers/slot-template.controller';
import { PricingRuleController }  from './controllers/pricing-rule.controller';
import { BlackoutController }     from './controllers/blackout.controller';
import { HolidayController }      from './controllers/holiday.controller';
import { VenueSlotController }    from './controllers/venue-slot.controller';

// Cross-module dependencies
import { CourtModule } from '../court/court.module';

/**
 * SlotModule — the complete slot engine.
 *
 * Entities registered: slots, slot_templates, pricing_rules, blackouts, holidays
 *
 * CourtModule: imported so SlotGeneratorService and AvailabilityService can
 *   use CourtRepository directly (same DB) instead of calling identity-service
 *   over HTTP.  Court validation (isActive, isBookable, tenantId) is now
 *   enforced at the DB layer with a typed query.
 *
 * Exports SlotService and AvailabilityService so BookingModule can:
 *   - Reserve slots before confirming a booking (SlotService.reserve)
 *   - Check availability during booking (AvailabilityService.isWindowFree)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SlotEntity,
      SlotTemplateEntity,
      PricingRuleEntity,
      BlackoutEntity,
      RateCardEntity,
      HolidayEntity,
    ]),
    CourtModule,
  ],
  controllers: [
    RateCardController,
    SlotController,
    SlotTemplateController,
    PricingRuleController,
    BlackoutController,
    HolidayController,
    VenueSlotController,
  ],
  providers: [
    RateCardRepository,
    RateCardService,
    // Repositories
    SlotRepository,
    SlotTemplateRepository,
    PricingRuleRepository,
    BlackoutRepository,
    HolidayRepository,
    // Services
    SlotService,
    SlotGeneratorService,
    PricingService,
    PricingRuleValidationService,
    AvailabilityService,
    HolidayService,
  ],
  exports: [
    RateCardService,
    SlotService,
    AvailabilityService,
    PricingService,
  ],
})
export class SlotModule {}
