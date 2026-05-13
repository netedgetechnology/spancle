import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './controllers/dashboard.controller';
import { DashboardService } from './services/dashboard.service';
import { DashboardRepository } from './repositories/dashboard.repository';
import { DashboardEntity } from './entities/dashboard.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DashboardEntity])],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
