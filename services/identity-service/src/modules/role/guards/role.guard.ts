import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../user/guards/user.guard';

/**
 * RoleGuard — extends TenantGuard.
 * Add role-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class RoleGuard extends TenantGuard {}

export { TenantGuard } from '../../user/guards/user.guard';
