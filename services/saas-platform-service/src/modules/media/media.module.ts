import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaAssetEntity } from './entities/media-asset.entity';
import { MediaController } from './controllers/media.controller';
import { MediaService } from './services/media.service';
import { MediaAssetRepository } from './repositories/media-asset.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MediaAssetEntity])],
  controllers: [MediaController],
  providers: [MediaService, MediaAssetRepository],
  exports: [MediaService],
})
export class MediaModule {}
