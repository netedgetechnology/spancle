import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../booking/guards/booking.guard';

/**
 * SlotGuard — extends TenantGuard.
 * Add slot-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class SlotGuard extends TenantGuard {}

export { TenantGuard } from '../../booking/guards/booking.guard';
