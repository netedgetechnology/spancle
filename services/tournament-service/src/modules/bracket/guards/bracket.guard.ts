import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../tournament/guards/tournament.guard';

/**
 * BracketGuard — extends TenantGuard.
 * Add bracket-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class BracketGuard extends TenantGuard {}

export { TenantGuard } from '../../tournament/guards/tournament.guard';
