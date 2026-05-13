import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademyController } from './controllers/academy.controller';
import { AcademyService } from './services/academy.service';
import { AcademyRepository } from './repositories/academy.repository';
import { AcademyEntity } from './entities/academy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AcademyEntity])],
  controllers: [AcademyController],
  providers: [AcademyService, AcademyRepository],
  exports: [AcademyService],
})
export class AcademyModule {}
