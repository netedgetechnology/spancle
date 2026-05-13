import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HomepageSectionEntity }    from './entities/homepage-section.entity';
import { HomepageController }       from './controllers/homepage.controller';
import { HomepageService }          from './services/homepage.service';
import { HomepageSectionRepository } from './repositories/homepage-section.repository';

@Module({
  imports:     [TypeOrmModule.forFeature([HomepageSectionEntity])],
  controllers: [HomepageController],
  providers:   [HomepageService, HomepageSectionRepository],
  exports:     [HomepageService],
})
export class HomepageModule {}
