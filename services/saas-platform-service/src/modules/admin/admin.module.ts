import { Module } from '@nestjs/common';
import { AdminStatsController } from './controllers/admin-stats.controller';
import { AdminStatsService }    from './services/admin-stats.service';
import { SuperAdminGuard }      from './guards/super-admin.guard';

/**
 * AdminModule — platform administration endpoints.
 *
 * All routes require SUPER_ADMIN role (enforced by SuperAdminGuard
 * at controller class level, plus the global RolesGuard chain).
 *
 * Registered in AppModule.imports alongside CmsModule.
 */
@Module({
  controllers: [AdminStatsController],
  providers:   [AdminStatsService, SuperAdminGuard],
  exports:     [AdminStatsService],
})
export class AdminModule {}
