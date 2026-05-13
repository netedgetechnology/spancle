import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../academy/guards/academy.guard';

/**
 * CoachGuard — extends TenantGuard.
 * Add coach-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class CoachGuard extends TenantGuard {}

export { TenantGuard } from '../../academy/guards/academy.guard';
