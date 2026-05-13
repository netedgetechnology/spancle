import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BracketController } from './controllers/bracket.controller';
import { BracketService } from './services/bracket.service';
import { BracketRepository } from './repositories/bracket.repository';
import { BracketEntity } from './entities/bracket.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BracketEntity])],
  controllers: [BracketController],
  providers: [BracketService, BracketRepository],
  exports: [BracketService],
})
export class BracketModule {}
