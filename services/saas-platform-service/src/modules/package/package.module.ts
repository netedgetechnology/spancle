import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackageEntity }     from './entities/package.entity';
import { PackageController } from './controllers/package.controller';
import { PackageService }    from './services/package.service';
import { PackageRepository } from './repositories/package.repository';
import { SuperAdminGuard }   from '../admin/guards/super-admin.guard';

@Module({
  imports:     [TypeOrmModule.forFeature([PackageEntity])],
  controllers: [PackageController],
  providers:   [PackageService, PackageRepository, SuperAdminGuard],
  exports:     [PackageService],
})
export class PackageModule {}
