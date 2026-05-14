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
export declare class AdminStatsController {
    private readonly statsService;
    constructor(statsService: AdminStatsService);
    getStats(period?: number): Promise<AdminStatsResponse>;
}
//# sourceMappingURL=admin-stats.controller.d.ts.map