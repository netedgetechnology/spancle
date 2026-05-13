import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../tenant/guards/tenant.guard';

/**
 * PlanGuard — extends TenantGuard.
 * Add plan-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class PlanGuard extends TenantGuard {}

export { TenantGuard } from '../../tenant/guards/tenant.guard';
