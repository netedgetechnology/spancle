import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CourtEntity }          from './entities/court.entity';
import { CourtRepository }      from './repositories/court.repository';
import { CourtService }         from './services/court.service';
import { CourtController, VenueCourtController } from './controllers/court.controller';
import { VenueModule }          from '../venue/venue.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CourtEntity]),
    VenueModule,   // provides VenueService for venue-existence validation
  ],
  controllers: [CourtController, VenueCourtController],
  providers:   [CourtRepository, CourtService],
  exports:     [CourtService],
})
export class CourtModule {}
