import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../report/guards/report.guard';

/**
 * MetricGuard — extends TenantGuard.
 * Add metric-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class MetricGuard extends TenantGuard {}

export { TenantGuard } from '../../report/guards/report.guard';
