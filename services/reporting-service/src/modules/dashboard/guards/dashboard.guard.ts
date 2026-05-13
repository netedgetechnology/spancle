import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../report/guards/report.guard';

/**
 * DashboardGuard — extends TenantGuard.
 * Add dashboard-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class DashboardGuard extends TenantGuard {}

export { TenantGuard } from '../../report/guards/report.guard';
