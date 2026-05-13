import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanEntity }      from './entities/plan.entity';
import { PlanController }  from './controllers/plan.controller';
import { PlanService }     from './services/plan.service';
import { PlanRepository }  from './repositories/plan.repository';
import { PackageModule }   from '../package/package.module';
import { SuperAdminGuard } from '../admin/guards/super-admin.guard';

@Module({
  imports:     [TypeOrmModule.forFeature([PlanEntity]), PackageModule],
  controllers: [PlanController],
  providers:   [PlanService, PlanRepository, SuperAdminGuard],
  exports:     [PlanService],
})
export class PlanModule {}
