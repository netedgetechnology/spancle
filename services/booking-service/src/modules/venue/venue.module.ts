import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueController } from './controllers/venue.controller';
import { VenueService } from './services/venue.service';
import { VenueRepository } from './repositories/venue.repository';
import { VenueEntity } from './entities/venue.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VenueEntity])],
  controllers: [VenueController],
  providers: [VenueService, VenueRepository],
  exports: [VenueService],
})
export class VenueModule {}
