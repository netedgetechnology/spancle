import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntryEntity } from './entities/waitlist-entry.entity';
import { WaitlistRepository }  from './repositories/waitlist.repository';
import { WaitlistService }     from './services/waitlist.service';
import { WaitlistController }  from './controllers/waitlist.controller';

// WaitlistService listens on SlotEvents.SLOTS_RELEASED and reads SlotRepository.
// SlotModule is imported via PricingModule in BookingModule — to avoid wiring
// the full BookingModule dependency tree here, WaitlistModule imports SlotModule
// directly for SlotRepository access. No circular dependency: WaitlistModule
// does not import BookingModule.
import { SlotModule } from '../slot/slot.module';

@Module({
  imports:     [TypeOrmModule.forFeature([WaitlistEntryEntity]), SlotModule],
  controllers: [WaitlistController],
  providers:   [WaitlistRepository, WaitlistService],
  exports:     [WaitlistService],
})
export class WaitlistModule {}
