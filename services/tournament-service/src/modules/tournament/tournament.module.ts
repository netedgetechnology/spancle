import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TournamentController } from './controllers/tournament.controller';
import { TournamentService } from './services/tournament.service';
import { TournamentRepository } from './repositories/tournament.repository';
import { TournamentEntity } from './entities/tournament.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TournamentEntity])],
  controllers: [TournamentController],
  providers: [TournamentService, TournamentRepository],
  exports: [TournamentService],
})
export class TournamentModule {}
