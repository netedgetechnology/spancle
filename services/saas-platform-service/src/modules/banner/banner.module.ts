import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerEntity } from './entities/banner.entity';
import { BannerController } from './controllers/banner.controller';
import { BannerService } from './services/banner.service';
import { BannerRepository } from './repositories/banner.repository';

@Module({
  imports: [TypeOrmModule.forFeature([BannerEntity])],
  controllers: [BannerController],
  providers: [BannerService, BannerRepository],
  exports: [BannerService],
})
export class BannerModule {}
