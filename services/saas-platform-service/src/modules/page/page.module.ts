import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PageEntity } from './entities/page.entity';
import { PageController } from './controllers/page.controller';
import { PageService } from './services/page.service';
import { PageRepository } from './repositories/page.repository';

@Module({
  imports: [TypeOrmModule.forFeature([PageEntity])],
  controllers: [PageController],
  providers: [PageService, PageRepository],
  exports: [PageService],
})
export class PageModule {}
