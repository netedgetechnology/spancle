import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MatchController } from './controllers/match.controller';
import { MatchService } from './services/match.service';
import { MatchRepository } from './repositories/match.repository';
import { MatchEntity } from './entities/match.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MatchEntity])],
  controllers: [MatchController],
  providers: [MatchService, MatchRepository],
  exports: [MatchService],
})
export class MatchModule {}
