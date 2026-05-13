import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerController } from './controllers/player.controller';
import { PlayerService } from './services/player.service';
import { PlayerRepository } from './repositories/player.repository';
import { PlayerEntity } from './entities/player.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerEntity])],
  controllers: [PlayerController],
  providers: [PlayerService, PlayerRepository],
  exports: [PlayerService],
})
export class PlayerModule {}
