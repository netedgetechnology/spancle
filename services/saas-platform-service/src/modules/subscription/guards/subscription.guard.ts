import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../tenant/guards/tenant.guard';

/**
 * SubscriptionGuard — extends TenantGuard.
 * Add subscription-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class SubscriptionGuard extends TenantGuard {}

export { TenantGuard } from '../../tenant/guards/tenant.guard';
