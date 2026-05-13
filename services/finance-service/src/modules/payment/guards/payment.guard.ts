import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../invoice/guards/invoice.guard';

/**
 * PaymentGuard — extends TenantGuard.
 * Add payment-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class PaymentGuard extends TenantGuard {}

export { TenantGuard } from '../../invoice/guards/invoice.guard';
