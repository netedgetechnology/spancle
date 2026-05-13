import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../academy/guards/academy.guard';

/**
 * PlayerGuard — extends TenantGuard.
 * Add player-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class PlayerGuard extends TenantGuard {}

export { TenantGuard } from '../../academy/guards/academy.guard';
