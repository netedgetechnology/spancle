import { Injectable } from '@nestjs/common';
import { TenantGuard } from '../../invoice/guards/invoice.guard';

/**
 * WalletGuard — extends TenantGuard.
 * Add wallet-specific RBAC permission checks in Sprint 2.
 */
@Injectable()
export class WalletGuard extends TenantGuard {}

export { TenantGuard } from '../../invoice/guards/invoice.guard';
