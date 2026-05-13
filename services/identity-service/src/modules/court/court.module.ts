import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourtEntity }     from './entities/court.entity';
import { CourtController } from './controllers/court.controller';
import { CourtService }    from './services/court.service';
import { CourtRepository } from './repositories/court.repository';
import { BranchModule }    from '../branch/branch.module';
import { SportModule }     from '../sport/sport.module';

/**
 * CourtModule — tenant court / venue management.
 *
 * Imports:
 *   BranchModule → BranchService.findOne() validates branch ownership
 *   SportModule  → SportService.findOne() validates sport ownership
 *
 * Registered in AppModule.imports after BranchModule and SportModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([CourtEntity]),
    BranchModule,
    SportModule,
  ],
  controllers: [CourtController],
  providers:   [CourtService, CourtRepository],
  exports:     [CourtService],
})
export class CourtModule {}
