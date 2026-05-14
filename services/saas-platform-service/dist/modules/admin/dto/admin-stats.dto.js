"use strict";
/**
 * AdminStatsDto — aggregated platform statistics for the superadmin dashboard.
 *
 * Returned by GET /api/v1/admin/stats
 * Consumed by the superadmin-portal dashboard widgets.
 *
 * Design notes:
 *   - All counts are integers; monetary values are in minor currency units (pence/cents)
 *   - `previousPeriod` values allow delta calculation in the frontend
 *   - `period` indicates the window used for "new this period" counts (default: 30 days)
 *   - Fields marked [STUB] are populated with placeholders pending service integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
//# sourceMappingURL=admin-stats.dto.js.map