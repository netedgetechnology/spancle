import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../booking/guards/booking.guard';

/**
 * VenueGuard — extends TenantGuard.
 * Add venue-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class VenueGuard extends TenantGuard {}

export { TenantGuard } from '../../booking/guards/booking.guard';
