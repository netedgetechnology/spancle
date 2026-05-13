import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SportEntity }           from './entities/sport.entity';
import { SportBranchEntity }     from './entities/sport-branch.entity';
import { SportController }       from './controllers/sport.controller';
import { SportService }          from './services/sport.service';
import { SportRepository }       from './repositories/sport.repository';
import { SportBranchRepository } from './repositories/sport-branch.repository';
import { BranchModule }          from '../branch/branch.module';

/**
 * SportModule — tenant sport management.
 *
 * Imports BranchModule to access BranchService for:
 *   - Validating branch membership before assignment
 *   - Rejecting archived branches from being mapped to sports
 *
 * Registered in AppModule.imports after BranchModule.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([SportEntity, SportBranchEntity]),
    BranchModule,
  ],
  controllers: [SportController],
  providers:   [SportService, SportRepository, SportBranchRepository],
  exports:     [SportService],
})
export class SportModule {}
