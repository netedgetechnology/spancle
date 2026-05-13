import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CoachController } from './controllers/coach.controller';
import { CoachService } from './services/coach.service';
import { CoachRepository } from './repositories/coach.repository';
import { CoachEntity } from './entities/coach.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CoachEntity])],
  controllers: [CoachController],
  providers: [CoachService, CoachRepository],
  exports: [CoachService],
})
export class CoachModule {}
