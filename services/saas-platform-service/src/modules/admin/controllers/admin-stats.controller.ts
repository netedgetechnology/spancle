import {
  Controller,
  Get,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuditInterceptor }  from '../../../common/interceptors/audit.interceptor';
import { SuperAdminGuard }   from '../guards/super-admin.guard';
import { AdminStatsService } from '../services/admin-stats.service';
import type { AdminStatsResponse } from '../dto/admin-stats.dto';

/**
 * AdminStatsController — platform-wide metrics for the superadmin dashboard.
 *
 * All routes require:
 *   - JwtAuthGuard (global — via AppModule)
 *   - SuperAdminGuard (class-level — role === 'SUPER_ADMIN')
 *
 * Routes:
 *   GET /api/v1/admin/stats?period=30
 *     Returns aggregated platform statistics for the given period window.
 *     period: number of days for "this period" comparisons (default: 30)
 */
@Controller({ path: 'admin', version: '1' })
@UseGuards(SuperAdminGuard)
@UseInterceptors(AuditInterceptor)
export class AdminStatsController {
  constructor(private readonly statsService: AdminStatsService) {}

  @Get('stats')
  getStats(
    @Query('period', new ParseIntPipe({ optional: true }))
    period?: number,
  ): Promise<AdminStatsResponse> {
    return this.statsService.getStats(period ?? 30);
  }
}
