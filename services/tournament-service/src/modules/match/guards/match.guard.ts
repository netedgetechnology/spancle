import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../tournament/guards/tournament.guard';

/**
 * MatchGuard — extends TenantGuard.
 * Add match-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class MatchGuard extends TenantGuard {}

export { TenantGuard } from '../../tournament/guards/tournament.guard';
